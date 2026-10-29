from __future__ import annotations
import json, re
from pathlib import Path
from urllib.parse import urlparse, urljoin
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

OUT=Path("crawl-output")
OUT.mkdir(exist_ok=True)
TARGET="https://www.408os.cn/guide/"
ALLOWED={"408os.cn","www.408os.cn","api.408os.cn","oss.408os.cn"}
events=[]
captured=[]

def allowed(url:str)->bool:
    try:
        h=(urlparse(url).hostname or "").lower()
        return h in ALLOWED or h.endswith(".408os.cn")
    except Exception:
        return False

def compact_text(page, limit=40000):
    try: return page.locator("body").inner_text(timeout=5000)[:limit]
    except Exception: return ""

def snapshot(page, name):
    data={"name":name,"url":page.url,"title":page.title(),"text":compact_text(page),"links":[],"buttons":[],"scripts":[],"resources":[]}
    for el in page.locator("a[href]").all():
        try:data["links"].append({"text":" ".join(el.inner_text().split())[:200],"href":el.get_attribute("href"),"onclick":el.get_attribute("onclick")})
        except:pass
    for el in page.locator("button").all():
        try:data["buttons"].append({"text":" ".join(el.inner_text().split())[:200],"onclick":el.get_attribute("onclick"),"outerHTML":el.evaluate("(e)=>e.outerHTML")[:1200]})
        except:pass
    for el in page.locator("script").all():
        try:data["scripts"].append({"src":el.get_attribute("src"),"inline":(el.inner_text() or "")[:4000]})
        except:pass
    try:data["resources"]=page.evaluate("performance.getEntriesByType('resource').map(x=>x.name)")
    except:pass
    (OUT/f"{name}.html").write_text(page.content(),encoding="utf-8")
    try:page.screenshot(path=str(OUT/f"{name}.png"),full_page=True)
    except:pass
    return data

def locator_context(locator):
    try:
        return locator.evaluate("""e=>{
          let n=e; const out=[];
          for(let i=0;i<6&&n;i++,n=n.parentElement){out.push(n.outerHTML.slice(0,2500))}
          return out;
        }""")
    except Exception as e:
        return [repr(e)]

def scan_bundles(context, page):
    try: resources=page.evaluate("performance.getEntriesByType('resource').map(x=>x.name)")
    except: resources=[]
    urls=[]
    for u in resources:
        if allowed(u) and re.search(r"/assets/.*\.js(?:\?|$)",u):
            if u not in urls: urls.append(u)
    result=[]
    terms=re.compile(r"relax|1000|exercise|practice|question|题库|刷题|/api/|api\.408os\.cn",re.I)
    urlre=re.compile(r'https?://[^"\'\s)]+|/api/[A-Za-z0-9_?&=./:%{}$-]+')
    for i,u in enumerate(urls[:30]):
        item={"url":u,"matches":[],"endpoints":[]}
        try:
            resp=context.request.get(u,timeout=20000)
            txt=resp.text()
            (OUT/f"bundle-{i:02d}.js").write_text(txt,encoding="utf-8")
            item["status"]=resp.status
            item["bytes"]=len(txt.encode("utf-8"))
            item["endpoints"]=list(dict.fromkeys(urlre.findall(txt)))[:100]
            for m in terms.finditer(txt):
                a=max(0,m.start()-260); b=min(len(txt),m.end()+420)
                snippet=txt[a:b]
                if snippet not in item["matches"]: item["matches"].append(snippet)
                if len(item["matches"])>=30: break
        except Exception as e:
            item["error"]=repr(e)
        result.append(item)
    return result

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={"width":1440,"height":1000})
    page=context.new_page()

    def bind(pg):
        def on_request(req):
            if allowed(req.url): events.append({"page":pg.url,"kind":"request","type":req.resource_type,"method":req.method,"url":req.url})
        def on_response(resp):
            req=resp.request
            if not allowed(resp.url): return
            entry={"page":pg.url,"kind":"response","type":req.resource_type,"status":resp.status,"url":resp.url,"content_type":resp.headers.get("content-type","")}
            events.append(entry)
            ctype=entry["content_type"].lower()
            if req.resource_type in {"xhr","fetch"} or "json" in ctype:
                try:
                    body=resp.body()
                    if len(body)<=5_000_000:
                        fn=f"response-{len(captured):04d}.txt"
                        (OUT/fn).write_text(body.decode("utf-8","replace"),encoding="utf-8")
                        captured.append({**entry,"file":fn,"bytes":len(body)})
                except Exception as e: entry["body_error"]=repr(e)
        pg.on("request",on_request); pg.on("response",on_response)

    bind(page)
    result={"target":TARGET,"steps":[]}
    try:
        try:
            r=page.goto(TARGET,wait_until="domcontentloaded",timeout=30000); result["initial_status"]=r.status if r else None
        except PlaywrightTimeoutError as e: result["initial_timeout"]=repr(e)
        page.wait_for_timeout(2500)
        result["steps"].append(snapshot(page,"01-guide"))

        start=page.get_by_role("button",name=re.compile("立即开始"))
        result["start_button_count"]=start.count()
        if start.count():
            try:
                start.first.click(timeout=10000); page.wait_for_timeout(5000)
                result["steps"].append(snapshot(page,"02-after-start"))
            except Exception as e: result["start_click_error"]=repr(e)

        result["bundle_scan"]=scan_bundles(context,page)

        brush=page.get_by_text("立即刷题",exact=True)
        result["brush_count"]=brush.count()
        if brush.count():
            result["brush_context"]=locator_context(brush.first)
            try:
                brush.first.click(timeout=10000); page.wait_for_timeout(5000)
                result["steps"].append(snapshot(page,"03-after-brush"))
            except Exception as e: result["brush_click_error"]=repr(e)

        relax=page.get_by_text(re.compile(r"Relax\s*1000|1000\s*题",re.I))
        result["relax_visible_count"]=relax.count()
        if relax.count():
            result["relax_context"]=locator_context(relax.first)
            try:
                relax.first.click(timeout=10000); page.wait_for_timeout(5000)
                result["steps"].append(snapshot(page,"04-relax1000"))
            except Exception as e: result["relax_click_error"]=repr(e)

        result["useful_events"]=[e for e in events if re.search(r"(relax|1000|question|exercise|practice|api|data|json|bank|auth|login)",e.get("url",""),re.I)]
    except Exception as e:
        result["fatal_error"]=repr(e)
    finally:
        result["events"]=events
        result["captured_responses"]=captured
        (OUT/"probe.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
        browser.close()
print((OUT/"probe.json").read_text(encoding="utf-8"))
