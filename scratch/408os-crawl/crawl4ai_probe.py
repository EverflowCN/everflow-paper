import asyncio, json
from pathlib import Path
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

OUT=Path("crawl-output")
OUT.mkdir(exist_ok=True)

async def main():
    browser=BrowserConfig(
        browser_type="chromium",
        headless=True,
    )
    run=CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        capture_network_requests=True,
        wait_for="css:body",
        delay_before_return_html=2.0,
    )
    async with AsyncWebCrawler(config=browser) as crawler:
        result=await crawler.arun("https://www.408os.cn/dashboard", config=run)
        data={
            "success":result.success,
            "url":getattr(result,"url",None),
            "status_code":getattr(result,"status_code",None),
            "html_len":len(result.html or ""),
            "markdown_len":len(str(result.markdown or "")),
            "network_requests":getattr(result,"network_requests",None) or [],
        }
        (OUT/"crawl4ai-probe.json").write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
        print(json.dumps({
            "success":data["success"],
            "url":data["url"],
            "status_code":data["status_code"],
            "html_len":data["html_len"],
            "network_count":len(data["network_requests"]),
            "interesting":[x for x in data["network_requests"] if "408os.cn" in str(x) and any(k in str(x).lower() for k in ["api","question","relax","knowledge"])][:30]
        },ensure_ascii=False,indent=2))

asyncio.run(main())
