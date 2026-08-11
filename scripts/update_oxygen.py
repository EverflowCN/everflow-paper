#!/usr/bin/env python3
"""同步 B 站 UP 主「就是氧气11」的 27 考研 408 强化视频。"""
from __future__ import annotations
import datetime as dt
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "site" / "data" / "oxygen.json"
API = "https://api.bilibili.com/x/web-interface/search/type"
AUTHOR = "就是氧气11"

SUBJECTS = {
    "ds": {"keywords": ["27数据结构强化", "27考研408强化更新内容与方法论"], "prefixes": ["27数据结构强化-", "27数据结构强化—", "27数据结构强化："]},
    "co": {"keywords": ["27组成原理强化", "27计算机组成原理强化"], "prefixes": ["27组成原理强化-", "27组成原理强化—", "27组成原理强化：", "27考研408"]},
    "os": {"keywords": ["27操作系统强化"], "prefixes": ["27操作系统强化-", "27操作系统强化—", "27操作系统强化："]},
    "cn": {"keywords": ["27计网强化", "27计算机网络强化"], "prefixes": ["27计网强化-", "27计网强化—", "27计网强化：", "27计算机网络强化-", "27计算机网络强化—", "27计算机网络强化："]},
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
    "Accept": "application/json,text/plain,*/*",
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


def fetch_page(keyword: str, page: int) -> list[dict]:
    params = urllib.parse.urlencode({"search_type": "video", "keyword": keyword, "order": "pubdate", "page": page})
    req = urllib.request.Request(f"{API}?{params}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("code") != 0:
        raise RuntimeError(f"Bilibili API code={payload.get('code')} message={payload.get('message')}")
    return (payload.get("data") or {}).get("result") or []


def discover(subject: str) -> list[dict]:
    found: dict[str, dict] = {}
    for keyword in SUBJECTS[subject]["keywords"]:
        for page in range(1, 6):
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
                url = str(row.get("arcurl") or "").strip() or (f"https://www.bilibili.com/video/{bvid}/" if bvid else "")
                try:
                    pub = int(row.get("pubdate") or 0)
                except (TypeError, ValueError):
                    pub = 0
                item = {"id": stable_id(subject, title), "title": title, "duration": str(row.get("duration") or "").strip(), "url": url, "bvid": bvid, "publishedAt": pub}
                prev = found.get(item["id"])
                if not prev or item["publishedAt"] > prev.get("publishedAt", 0):
                    found[item["id"]] = item
            if len(rows) < 20:
                break
            time.sleep(0.35)
    return sorted(found.values(), key=lambda x: (x.get("publishedAt") or 0, x["title"]))


def merge(existing: list[dict], discovered: list[dict]) -> tuple[list[dict], int]:
    by_id = {str(item.get("id")): dict(item) for item in existing if item.get("id")}
    order = [str(item.get("id")) for item in existing if item.get("id")]
    added = 0
    for item in discovered:
        iid = item["id"]
        if iid in by_id:
            old = by_id[iid]
            for key in ("duration", "url", "bvid", "publishedAt"):
                if item.get(key):
                    old[key] = item[key]
            by_id[iid] = old
        else:
            by_id[iid] = item
            order.append(iid)
            added += 1
    return [by_id[i] for i in order], added


def now_cn_iso() -> str:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).replace(microsecond=0).isoformat()


def main() -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    total_added = 0
    success = 0
    errors: list[str] = []
    for subject in ("ds", "co", "os", "cn"):
        try:
            rows = discover(subject)
            if rows:
                merged, added = merge(data["subjects"][subject].get("items", []), rows)
                data["subjects"][subject]["items"] = merged
                total_added += added
            success += 1
        except Exception as exc:
            errors.append(f"{subject}: {type(exc).__name__}: {exc}")
    data["updatedAt"] = now_cn_iso()
    source = data.setdefault("source", {})
    source["auto"] = True
    source["syncStatus"] = "ok" if success else "error"
    if errors:
        source["message"] = f"本次 {success}/4 科同步成功；失败：" + " | ".join(errors)[:500]
    else:
        source["message"] = f"四科同步成功；本次新增 {total_added} 个课程条目。"
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(source["message"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
