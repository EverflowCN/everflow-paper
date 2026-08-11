#!/usr/bin/env python3
"""同步 B 站 UP 主「就是氧气11」的 27 考研 408 强化视频。

两种模式：
1. --subject ds --output sync/ds.json
   仅抓取一科并写出临时结果。抓取失败也会写 JSON，避免整条工作流中断。
2. --merge-dir sync
   将四科临时结果合并进 site/data/oxygen.json；失败科目保留旧数据。
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "site" / "data" / "oxygen.json"
API = "https://api.bilibili.com/x/web-interface/search/type"
AUTHOR = "就是氧气11"

SUBJECTS = {
    "ds": {
        "keywords": ["27数据结构强化"],
        "prefixes": ["27数据结构强化-", "27数据结构强化—", "27数据结构强化："],
    },
    "co": {
        "keywords": ["27组成原理强化", "27计算机组成原理强化"],
        "prefixes": ["27组成原理强化-", "27组成原理强化—", "27组成原理强化：", "27计算机组成原理强化-", "27计算机组成原理强化—", "27计算机组成原理强化："],
    },
    "os": {
        "keywords": ["27操作系统强化"],
        "prefixes": ["27操作系统强化-", "27操作系统强化—", "27操作系统强化："],
    },
    "cn": {
        "keywords": ["27计网强化", "27计算机网络强化"],
        "prefixes": ["27计网强化-", "27计网强化—", "27计网强化：", "27计算机网络强化-", "27计算机网络强化—", "27计算机网络强化："],
    },
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://search.bilibili.com/",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
}
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def clean_title(raw: str) -> str:
    text = html.unescape(TAG_RE.sub("", str(raw or ""))).strip()
    return SPACE_RE.sub(" ", text)


def normalize_title(subject: str, raw: str) -> str:
    title = clean_title(raw)
    for prefix in SUBJECTS[subject]["prefixes"]:
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
            break
    return title.strip(" -—：:")


def stable_id(subject: str, title: str) -> str:
    return f"{subject}|{title}"


def canonical_video_url(bvid: str, fallback: str = "") -> str:
    if bvid:
        return f"https://www.bilibili.com/video/{bvid}/"
    fallback = str(fallback or "").strip()
    if fallback.startswith("http://"):
        fallback = "https://" + fallback[len("http://"):]
    return fallback


def normalize_duration(raw: str) -> str:
    raw = str(raw or "").strip()
    if not raw:
        return ""
    parts = raw.split(":")
    try:
        nums = [int(x) for x in parts]
    except ValueError:
        return raw
    if len(nums) == 2:
        minutes, seconds = nums
        if minutes >= 60:
            hours, minutes = divmod(minutes, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return f"{minutes:02d}:{seconds:02d}"
    if len(nums) == 3:
        return f"{nums[0]:02d}:{nums[1]:02d}:{nums[2]:02d}"
    return raw


def fetch_page(keyword: str, page: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "search_type": "video",
        "keyword": keyword,
        "order": "pubdate",
        "page": page,
        "page_size": 20,
    })
    url = f"{API}?{params}"
    last_error: Exception | None = None
    for attempt in range(3):
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            if payload.get("code") != 0:
                raise RuntimeError(f"Bilibili API code={payload.get('code')} message={payload.get('message')}")
            return (payload.get("data") or {}).get("result") or []
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(3 + attempt * 5)
    assert last_error is not None
    raise last_error


def discover(subject: str) -> list[dict]:
    found: dict[str, dict] = {}
    keywords = SUBJECTS[subject]["keywords"]
    for keyword_index, keyword in enumerate(keywords):
        keyword_found = 0
        # 强化合集每科规模远小于 60 条；最多 3 页可明显降低触发 412 的概率。
        for page in range(1, 4):
            rows = fetch_page(keyword, page)
            if not rows:
                break
            for row in rows:
                if clean_title(row.get("author")) != AUTHOR:
                    continue
                title = normalize_title(subject, row.get("title"))
                if not title:
                    continue
                bvid = str(row.get("bvid") or "").strip()
                try:
                    pub = int(row.get("pubdate") or 0)
                except (TypeError, ValueError):
                    pub = 0
                item = {
                    "id": stable_id(subject, title),
                    "title": title,
                    "duration": normalize_duration(row.get("duration")),
                    "url": canonical_video_url(bvid, row.get("arcurl")),
                    "bvid": bvid,
                    "publishedAt": pub,
                }
                prev = found.get(item["id"])
                if not prev or item["publishedAt"] > prev.get("publishedAt", 0):
                    found[item["id"]] = item
                    keyword_found += 1
            if len(rows) < 20:
                break
            time.sleep(1.2)
        # 第二个关键词仅作为 fallback；第一个已有结果时不再继续打 API。
        if keyword_found:
            break
        if keyword_index + 1 < len(keywords):
            time.sleep(2)
    return sorted(found.values(), key=lambda x: (x.get("publishedAt") or 0, x["title"]))


def merge(existing: list[dict], discovered: list[dict]) -> tuple[list[dict], int, int]:
    by_id = {str(item.get("id")): dict(item) for item in existing if item.get("id")}
    order = [str(item.get("id")) for item in existing if item.get("id")]
    added = 0
    enriched = 0
    for item in discovered:
        iid = item["id"]
        if iid in by_id:
            old = by_id[iid]
            changed = False
            # 旧打卡表里的时长人工校过，优先保留；只在空值时补时长。
            if not old.get("duration") and item.get("duration"):
                old["duration"] = item["duration"]
                changed = True
            for key in ("url", "bvid", "publishedAt"):
                if item.get(key) and old.get(key) != item.get(key):
                    old[key] = item[key]
                    changed = True
            by_id[iid] = old
            if changed:
                enriched += 1
        else:
            by_id[iid] = item
            order.append(iid)
            added += 1
    return [by_id[i] for i in order], added, enriched


def now_cn_iso() -> str:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).replace(microsecond=0).isoformat()


def write_subject_result(subject: str, output: Path) -> int:
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        items = discover(subject)
        result = {"subject": subject, "ok": True, "items": items, "error": ""}
        print(f"{subject}: fetched {len(items)} items")
    except Exception as exc:  # 单科失败要保留结果供 merge 判断，不能让矩阵整体丢失 artifact。
        result = {"subject": subject, "ok": False, "items": [], "error": f"{type(exc).__name__}: {exc}"}
        print(f"{subject}: failed: {result['error']}")
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


def merge_results(sync_dir: Path) -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    statuses: dict[str, dict] = {}
    total_added = 0
    total_enriched = 0
    for subject in ("ds", "co", "os", "cn"):
        path = sync_dir / f"{subject}.json"
        if not path.exists():
            statuses[subject] = {"ok": False, "error": "artifact missing", "items": []}
            continue
        try:
            statuses[subject] = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            statuses[subject] = {"ok": False, "error": f"invalid artifact: {exc}", "items": []}

        result = statuses[subject]
        if result.get("ok"):
            merged, added, enriched = merge(
                data["subjects"][subject].get("items", []),
                result.get("items") or [],
            )
            data["subjects"][subject]["items"] = merged
            total_added += added
            total_enriched += enriched

    ok_subjects = [s for s, r in statuses.items() if r.get("ok")]
    failed_subjects = [s for s, r in statuses.items() if not r.get("ok")]
    source = data.setdefault("source", {})
    source["auto"] = True
    source["syncStatus"] = "ok" if len(ok_subjects) == 4 else ("partial" if ok_subjects else "error")
    source["subjectStatus"] = {
        s: {"ok": bool(statuses[s].get("ok")), "error": str(statuses[s].get("error") or "")[:180]}
        for s in ("ds", "co", "os", "cn")
    }
    if failed_subjects:
        failures = " | ".join(f"{s}: {statuses[s].get('error') or 'unknown'}" for s in failed_subjects)
        source["message"] = f"本次 {len(ok_subjects)}/4 科同步成功；已有数据均保留。失败：{failures}"[:700]
    else:
        source["message"] = f"四科同步成功；新增 {total_added} 条，补全 {total_enriched} 条课程元数据。"
    data["updatedAt"] = now_cn_iso()
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(source["message"])
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--subject", choices=tuple(SUBJECTS))
    mode.add_argument("--merge-dir", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.subject and not args.output:
        parser.error("--subject requires --output")
    return args


def main() -> int:
    args = parse_args()
    if args.subject:
        return write_subject_result(args.subject, args.output)
    return merge_results(args.merge_dir)


if __name__ == "__main__":
    raise SystemExit(main())
