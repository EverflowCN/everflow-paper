#!/usr/bin/env python3
"""Validate normalized question-bank or generated-paper JSONL files.

Usage:
    python validate_bank.py paper.jsonl
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED = {
    "id",
    "subject",
    "chapter",
    "knowledge_points",
    "type",
    "difficulty",
    "source",
    "stem",
    "answer",
    "solution",
    "estimated_minutes",
    "tags",
}

SUBJECTS = {"高等数学", "线性代数"}
DIFFICULTIES = {"foundation", "standard", "real-exam", "hard"}
SOURCE_KINDS = {"real_exam", "bank", "adapted", "generated"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate_question(q: dict, line_no: int, seen_ids: set[str]) -> list[str]:
    errors: list[str] = []
    missing = REQUIRED - q.keys()
    if missing:
        errors.append(f"line {line_no}: missing fields: {sorted(missing)}")
        return errors

    qid = str(q["id"]).strip()
    if not qid:
        errors.append(f"line {line_no}: empty id")
    elif qid in seen_ids:
        errors.append(f"line {line_no}: duplicate id {qid}")
    else:
        seen_ids.add(qid)

    if q["subject"] not in SUBJECTS:
        errors.append(f"line {line_no}: invalid subject {q['subject']!r}")

    if q["difficulty"] not in DIFFICULTIES:
        errors.append(f"line {line_no}: invalid difficulty {q['difficulty']!r}")

    if not isinstance(q["knowledge_points"], list) or not q["knowledge_points"]:
        errors.append(f"line {line_no}: knowledge_points must be a non-empty list")

    if not isinstance(q["tags"], list):
        errors.append(f"line {line_no}: tags must be a list")

    source = q["source"]
    if not isinstance(source, dict):
        errors.append(f"line {line_no}: source must be an object")
    else:
        kind = source.get("kind")
        if kind not in SOURCE_KINDS:
            errors.append(f"line {line_no}: invalid source.kind {kind!r}")
        if kind == "real_exam" and not (q.get("year") and q.get("question_no")):
            errors.append(
                f"line {line_no}: real_exam requires year and question_no for verification"
            )

    for field in ("stem", "answer", "solution"):
        if not isinstance(q[field], str) or not q[field].strip():
            errors.append(f"line {line_no}: {field} must be non-empty text")

    minutes = q["estimated_minutes"]
    if not isinstance(minutes, (int, float)) or minutes <= 0:
        errors.append(f"line {line_no}: estimated_minutes must be > 0")

    if isinstance(q.get("solution"), str) and q["solution"].strip() in {"略", "略。", "同理"}:
        errors.append(f"line {line_no}: incomplete solution placeholder")

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python validate_bank.py <questions.jsonl>")
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"ERROR: file not found: {path}")
        return 2

    errors: list[str] = []
    seen_ids: set[str] = set()
    count = 0

    with path.open("r", encoding="utf-8") as f:
        for line_no, raw in enumerate(f, 1):
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            count += 1
            try:
                q = json.loads(raw)
            except json.JSONDecodeError as exc:
                errors.append(f"line {line_no}: invalid JSON: {exc}")
                continue
            if not isinstance(q, dict):
                errors.append(f"line {line_no}: each JSONL record must be an object")
                continue
            errors.extend(validate_question(q, line_no, seen_ids))

    if count == 0:
        errors.append("no question records found")

    if errors:
        print(f"FAILED: {len(errors)} validation error(s)")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"OK: {count} question(s) validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
