from __future__ import annotations
import json, os, re, time
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
        t=page.locator("body").inner_text(timeout=5000)
    except Exception:
        return ""
    return t[:limit]

def snapshot(page, name):
    data={
        "name":name,
        "url":page.url,
        "title":page.title(),
        "text":compact_text(page),
        "links":[],
        "buttons":[],
        "scripts":[],
    }
    for el in page.locator("a[href]").all():
        try:
            data["links"].append({"text":" ".join(el.inner_text().split())[:200],"href":el.get_attribute("href")})
        except Exception:
            pass
    for el in page.locator("button").all():
        try:
            data["buttons"].append(" ".join(el.inner_text().split())[:200])
        except Exception:
            pass
    for el in page.locator("script[src]").all():
        try:
            data["scripts"].append(el.get_attribute("src"))
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

    def on_request(req):
        if allowed(req.url):
            events.append({"kind":"request","type":req.resource_type,"method":req.method,"url":req.url})

    def on_response(resp):
        req=resp.request
        if not allowed(resp.url):
            return
        entry={"kind":"response","type":req.resource_type,"status":resp.status,"url":resp.url,
               "content_type":resp.headers.get("content-type","")}
        events.append(entry)
        ctype=entry["content_type"].lower()
        if req.resource_type in {"xhr","fetch"} or "json" in ctype:
            try:
                body=resp.body()
                if len(body)<=2_000_000:
                    text=body.decode("utf-8","replace")
                    idx=len(captured)
                    fn=f"response-{idx:04d}.txt"
                    (OUT/fn).write_text(text,encoding="utf-8")
                    captured.append({**entry,"file":fn,"bytes":len(body)})
            except Exception as e:
                entry["body_error"]=repr(e)

    page.on("request", on_request)
    page.on("response", on_response)

    result={"target":TARGET,"steps":[],"captured_responses":captured}
    try:
        r=page.goto(TARGET,wait_until="networkidle",timeout=60000)
        result["initial_status"]=r.status if r else None
        result["steps"].append(snapshot(page,"01-guide"))

        # Click public "立即开始" if present.
        start=page.get_by_role("button",name=re.compile("立即开始"))
        if start.count():
            try:
                start.first.click(timeout=10000)
                try:
                    page.wait_for_load_state("networkidle",timeout=30000)
                except PlaywrightTimeoutError:
                    page.wait_for_timeout(4000)
                result["steps"].append(snapshot(page,"02-after-start"))
            except Exception as e:
                result["start_click_error"]=repr(e)

        # If Relax1000 is directly visible on the public page, enter it.
        relax=page.get_by_text(re.compile("Relax\s*1000",re.I))
        if relax.count():
            try:
                relax.first.click(timeout=10000)
                try:
                    page.wait_for_load_state("networkidle",timeout=30000)
                except PlaywrightTimeoutError:
                    page.wait_for_timeout(4000)
                result["steps"].append(snapshot(page,"03-relax1000"))
            except Exception as e:
                result["relax_click_error"]=repr(e)

        # Record visible URLs containing useful route/API keywords.
        useful=[]
        for e in events:
            u=e.get("url","")
            if re.search(r"(relax|question|exercise|practice|api|data|json|bank)",u,re.I):
                useful.append(e)
        result["useful_events"]=useful
    except Exception as e:
        result["fatal_error"]=repr(e)
    finally:
        result["events"]=events
        result["captured_responses"]=captured
        (OUT/"probe.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
        browser.close()

print((OUT/"probe.json").read_text(encoding="utf-8"))
