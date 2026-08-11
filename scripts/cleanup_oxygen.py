#!/usr/bin/env python3
"""清理氧气11强化表中由 B 站标题写法差异造成的重复课程。

只合并已确认是同一课程的别名，保留旧版打卡表使用的稳定 ID，避免影响浏览器已有进度。
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "site" / "data" / "oxygen.json"

ALIASES = {
    "co": {
        "27考研408计算机组成原理强化课更新指南": "计算机组成原理强化课更新指南",
        "乘除法运算及其电路专题专题": "乘除法运算及其电路专题",
    },
    "os": {
        "27考研408操作系统强化课更新指南": "操作系统强化课更新指南",
    },
    "cn": {
        "27考研408计算机网络强化课更新指南": "计算机网络强化课更新指南",
    },
}


def merge_fields(target: dict, source: dict) -> None:
    # 旧表的标题、时长优先；B站同步结果用于补齐链接和发布时间。
    if not target.get("duration") and source.get("duration"):
        target["duration"] = source["duration"]
    for key in ("url", "bvid", "publishedAt"):
        if source.get(key) and not target.get(key):
            target[key] = source[key]


def main() -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    removed = []

    for subject, alias_map in ALIASES.items():
        info = (data.get("subjects") or {}).get(subject) or {}
        items = list(info.get("items") or [])
        by_title = {str(item.get("title") or ""): item for item in items}

        for alias, canonical in alias_map.items():
            source = by_title.get(alias)
            if not source:
                continue

            target = by_title.get(canonical)
            if target:
                merge_fields(target, source)
                items = [item for item in items if item is not source]
                removed.append(f"{subject}:{alias}")
            else:
                # 没有旧稳定项时直接改成规范标题/ID。
                source["title"] = canonical
                source["id"] = f"{subject}|{canonical}"
                by_title[canonical] = source

        info["items"] = items

    if removed:
        source = data.setdefault("source", {})
        source["cleanup"] = f"已合并 {len(removed)} 个重复标题别名"

    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"cleanup: removed {len(removed)} duplicate aliases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
