#!/usr/bin/env python3
"""同步 B 站 UP 主「就是氧气11」的 27 考研 408 强化视频。

优先直接读取 UP 主的「27考研408计算机基础综合合集」，再按标题筛 DS/CO/OS/CN。
合集接口失败时，才回退到 B 站搜索接口。失败科目不会覆盖已有打卡数据。
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "site" / "data" / "oxygen.json"
MID = 378777885
AUTHOR = "就是氧气11"
COLLECTION_NAME = "27考研408计算机基础综合合集"
SEARCH_API = "https://api.bilibili.com/x/web-interface/search/type"
COLLECTION_LIST_API = "https://api.bilibili.com/x/polymer/web-space/home/seasons_series"
COLLECTION_ARCHIVES_API = "https://api.bilibili.com/x/polymer/web-space/seasons_archives_list"

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
    "Referer": f"https://space.bilibili.com/{MID}/lists",
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
    # 更新指南保留可读标题，普通课程去掉“27xx强化-”前缀。
    if "强化课更新指南" in title or "强化更新内容与方法论" in title:
        return title
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


def normalize_duration(raw) -> str:
    if isinstance(raw, (int, float)):
        seconds = max(0, int(raw))
        hours, rem = divmod(seconds, 3600)
        minutes, seconds = divmod(rem, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"
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


def request_json(url: str, params: dict, referer: str | None = None) -> dict:
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}"
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    last_error: Exception | None = None
    for attempt in range(4):
        req = urllib.request.Request(full_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            if payload.get("code") != 0:
                raise RuntimeError(f"Bilibili API code={payload.get('code')} message={payload.get('message')}")
            return payload
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(4 + attempt * 6)
    assert last_error is not None
    raise last_error


def collection_meta(item: dict) -> dict:
    return item.get("meta") if isinstance(item.get("meta"), dict) else item


def find_collection() -> tuple[int, str]:
    payload = request_json(
        COLLECTION_LIST_API,
        {"mid": MID, "page_num": 1, "page_size": 50, "web_location": "333.999"},
    )
    lists = ((payload.get("data") or {}).get("items_lists") or {})
    seasons = lists.get("seasons_list") or []
    for item in seasons:
        meta = collection_meta(item)
        name = clean_title(meta.get("name"))
        if name == COLLECTION_NAME or COLLECTION_NAME in name:
            season_id = int(meta.get("season_id") or 0)
            if season_id:
                return season_id, name
    available = [clean_title(collection_meta(x).get("name")) for x in seasons]
    raise RuntimeError(f"未在 UP 主合集列表找到 {COLLECTION_NAME}；可见合集：{available[:12]}")


def fetch_collection_archives() -> tuple[list[dict], int, str]:
    season_id, name = find_collection()
    referer = f"https://space.bilibili.com/{MID}/lists/{season_id}?type=season"
    first = request_json(
        COLLECTION_ARCHIVES_API,
        {"mid": MID, "season_id": season_id, "sort_reverse": "true", "page_num": 1, "page_size": 30},
        referer,
    )
    data = first.get("data") or {}
    archives = list(data.get("archives") or [])
    page = data.get("page") or {}
    total = int(page.get("total") or len(archives))
    page_size = max(1, int(page.get("page_size") or 30))
    pages = max(1, math.ceil(total / page_size))
    for page_num in range(2, pages + 1):
        time.sleep(1.0)
        payload = request_json(
            COLLECTION_ARCHIVES_API,
            {"mid": MID, "season_id": season_id, "sort_reverse": "true", "page_num": page_num, "page_size": page_size},
            referer,
        )
        archives.extend((payload.get("data") or {}).get("archives") or [])
    return archives, season_id, name


def belongs_to_subject(subject: str, raw_title: str) -> bool:
    title = clean_title(raw_title)
    if subject == "ds":
        return title.startswith("27数据结构强化") or title == "27考研408强化更新内容与方法论-氧气版"
    if subject == "co":
        return title.startswith("27组成原理强化") or title.startswith("27计算机组成原理强化") or "计算机组成原理强化课更新指南" in title
    if subject == "os":
        return title.startswith("27操作系统强化") or "操作系统强化课更新指南" in title
    if subject == "cn":
        return title.startswith("27计网强化") or title.startswith("27计算机网络强化") or "计算机网络强化课更新指南" in title
    return False


def archive_to_item(subject: str, row: dict) -> dict:
    title = normalize_title(subject, row.get("title"))
    bvid = str(row.get("bvid") or "").strip()
    try:
        pub = int(row.get("pubdate") or row.get("ctime") or 0)
    except (TypeError, ValueError):
        pub = 0
    return {
        "id": stable_id(subject, title),
        "title": title,
        "duration": normalize_duration(row.get("duration")),
        "url": canonical_video_url(bvid),
        "bvid": bvid,
        "publishedAt": pub,
    }


def discover_from_collection(subject: str) -> tuple[list[dict], dict]:
    archives, season_id, name = fetch_collection_archives()
    items = [archive_to_item(subject, row) for row in archives if belongs_to_subject(subject, row.get("title"))]
    items = [item for item in items if item["title"]]
    # 合集顺序就是用户在 B 站里看到的顺序；按发布时间稳定排序。
    items.sort(key=lambda x: (x.get("publishedAt") or 0, x["title"]))
    return items, {"method": "collection", "seasonId": season_id, "collection": name, "scanned": len(archives)}


def fetch_search_page(keyword: str, page: int) -> list[dict]:
    payload = request_json(
        SEARCH_API,
        {"search_type": "video", "keyword": keyword, "order": "pubdate", "page": page, "page_size": 20},
        "https://search.bilibili.com/",
    )
    return (payload.get("data") or {}).get("result") or []


def discover_from_search(subject: str) -> tuple[list[dict], dict]:
    found: dict[str, dict] = {}
    for keyword in SUBJECTS[subject]["keywords"]:
        for page in range(1, 4):
            rows = fetch_search_page(keyword, page)
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
                found[item["id"]] = item
            if len(rows) < 20:
                break
            time.sleep(1.0)
        if found:
            break
    return sorted(found.values(), key=lambda x: (x.get("publishedAt") or 0, x["title"])), {"method": "search"}


def discover(subject: str) -> tuple[list[dict], dict]:
    collection_error = ""
    try:
        items, meta = discover_from_collection(subject)
        if items:
            return items, meta
        collection_error = "合集读取成功，但未筛到该科强化视频"
    except Exception as exc:
        collection_error = f"{type(exc).__name__}: {exc}"

    # 只作为兜底。主路径已经切换到 27 强化合集。
    items, meta = discover_from_search(subject)
    meta["collectionError"] = collection_error
    return items, meta


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
        items, meta = discover(subject)
        if not items:
            raise RuntimeError("未找到该科 27 强化视频")
        result = {"subject": subject, "ok": True, "items": items, "error": "", "meta": meta}
        print(f"{subject}: fetched {len(items)} items via {meta.get('method')}")
    except Exception as exc:
        result = {"subject": subject, "ok": False, "items": [], "error": f"{type(exc).__name__}: {exc}", "meta": {}}
        print(f"{subject}: failed: {result['error']}")
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


def merge_results(sync_dir: Path) -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    statuses: dict[str, dict] = {}
    total_added = 0
    total_enriched = 0
    methods: dict[str, str] = {}
    for subject in ("ds", "co", "os", "cn"):
        path = sync_dir / f"{subject}.json"
        if not path.exists():
            statuses[subject] = {"ok": False, "error": "artifact missing", "items": [], "meta": {}}
            continue
        try:
            statuses[subject] = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            statuses[subject] = {"ok": False, "error": f"invalid artifact: {exc}", "items": [], "meta": {}}

        result = statuses[subject]
        methods[subject] = str((result.get("meta") or {}).get("method") or "")
        if result.get("ok"):
            merged, added, enriched = merge(data["subjects"][subject].get("items", []), result.get("items") or [])
            data["subjects"][subject]["items"] = merged
            total_added += added
            total_enriched += enriched

    ok_subjects = [s for s, r in statuses.items() if r.get("ok")]
    failed_subjects = [s for s, r in statuses.items() if not r.get("ok")]
    source = data.setdefault("source", {})
    source["auto"] = True
    source["syncStatus"] = "ok" if len(ok_subjects) == 4 else ("partial" if ok_subjects else "error")
    source["subjectStatus"] = {
        s: {
            "ok": bool(statuses[s].get("ok")),
            "error": str(statuses[s].get("error") or "")[:180],
            "method": methods.get(s, ""),
        }
        for s in ("ds", "co", "os", "cn")
    }
    if failed_subjects:
        failures = " | ".join(f"{s}: {statuses[s].get('error') or 'unknown'}" for s in failed_subjects)
        source["message"] = f"本次 {len(ok_subjects)}/4 科同步成功；优先读取27强化合集；已有数据均保留。失败：{failures}"[:700]
    else:
        source["message"] = f"27强化合集四科同步成功；新增 {total_added} 条，补全 {total_enriched} 条课程元数据。"
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
