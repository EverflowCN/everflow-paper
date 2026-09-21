from __future__ import annotations
import json, re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

OUT=Path("crawl-output")
OUT.mkdir(exist_ok=True)
TARGET="https://www.408os.cn/guide/"
ALLOWED={"408os.cn","www.408os.cn","oss.408os.cn"}

events=[]
captured=[]

def allowed(url:str)->bool:
    try:
        h=(urlparse(url).hostname or "").lower()
        return h in ALLOWED or h.endswith(".408os.cn")
    except Exception:
        return False

def compact_text(page, limit=30000):
    try:
        return page.locator("body").inner_text(timeout=5000)[:limit]
    except Exception:
        return ""

def snapshot(page, name):
    data={
        "name":name,
        "url":page.url,
        "title":page.title(),
        "text":compact_text(page),
        "links":[],
        "buttons":[],
        "scripts":[],
        "resources":[],
    }
    for el in page.locator("a[href]").all():
        try:
            data["links"].append({
                "text":" ".join(el.inner_text().split())[:200],
                "href":el.get_attribute("href"),
                "onclick":el.get_attribute("onclick"),
            })
        except Exception:
            pass
    for el in page.locator("button").all():
        try:
            data["buttons"].append({
                "text":" ".join(el.inner_text().split())[:200],
                "onclick":el.get_attribute("onclick"),
                "outerHTML":el.evaluate("(e)=>e.outerHTML")[:1000],
            })
        except Exception:
            pass
    for el in page.locator("script").all():
        try:
            src=el.get_attribute("src")
            txt=(el.inner_text() or "")[:5000]
            data["scripts"].append({"src":src,"inline":txt})
        except Exception:
            pass
    try:
        data["resources"]=page.evaluate("""performance.getEntriesByType('resource').map(x=>x.name)""")
    except Exception:
        pass
    (OUT/f"{name}.html").write_text(page.content(),encoding="utf-8")
    try:
        page.screenshot(path=str(OUT/f"{name}.png"),full_page=True)
    except Exception:
        pass
    return data

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={"width":1440,"height":1000})
    page=context.new_page()

    def bind(pg):
        def on_request(req):
            if allowed(req.url):
                events.append({"page":pg.url,"kind":"request","type":req.resource_type,"method":req.method,"url":req.url})
        def on_response(resp):
            req=resp.request
            if not allowed(resp.url):
                return
            entry={"page":pg.url,"kind":"response","type":req.resource_type,"status":resp.status,"url":resp.url,
                   "content_type":resp.headers.get("content-type","")}
            events.append(entry)
            ctype=entry["content_type"].lower()
            if req.resource_type in {"xhr","fetch"} or "json" in ctype:
                try:
                    body=resp.body()
                    if len(body)<=3_000_000:
                        idx=len(captured)
                        fn=f"response-{idx:04d}.txt"
                        (OUT/fn).write_text(body.decode("utf-8","replace"),encoding="utf-8")
                        captured.append({**entry,"file":fn,"bytes":len(body)})
                except Exception as e:
                    entry["body_error"]=repr(e)
        pg.on("request",on_request)
        pg.on("response",on_response)

    bind(page)
    result={"target":TARGET,"steps":[]}
    try:
        try:
            r=page.goto(TARGET,wait_until="domcontentloaded",timeout=30000)
            result["initial_status"]=r.status if r else None
        except PlaywrightTimeoutError as e:
            result["initial_timeout"]=repr(e)
        page.wait_for_timeout(3000)
        result["steps"].append(snapshot(page,"01-guide"))

        start=page.get_by_role("button",name=re.compile("立即开始"))
        result["start_button_count"]=start.count()
        if start.count():
            before_pages=len(context.pages)
            try:
                start.first.click(timeout=10000)
                page.wait_for_timeout(5000)
                if len(context.pages)>before_pages:
                    page=context.pages[-1]
                    bind(page)
                    try:
                        page.wait_for_load_state("domcontentloaded",timeout=15000)
                    except PlaywrightTimeoutError:
                        pass
                    page.wait_for_timeout(3000)
                result["steps"].append(snapshot(page,"02-after-start"))
            except Exception as e:
                result["start_click_error"]=repr(e)

        relax=page.get_by_text(re.compile(r"Relax\s*1000",re.I))
        result["relax_visible_count"]=relax.count()
        if relax.count():
            try:
                relax.first.click(timeout=10000)
                page.wait_for_timeout(5000)
                try:
                    page.wait_for_load_state("domcontentloaded",timeout=15000)
                except PlaywrightTimeoutError:
                    pass
                result["steps"].append(snapshot(page,"03-relax1000"))
            except Exception as e:
                result["relax_click_error"]=repr(e)

        result["useful_events"]=[
            e for e in events
            if re.search(r"(relax|question|exercise|practice|api|data|json|bank|auth|login)",e.get("url",""),re.I)
        ]
    except Exception as e:
        result["fatal_error"]=repr(e)
    finally:
        result["events"]=events
        result["captured_responses"]=captured
        (OUT/"probe.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
        browser.close()

print((OUT/"probe.json").read_text(encoding="utf-8"))
