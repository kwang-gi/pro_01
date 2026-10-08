#!/usr/bin/env python3
"""노션 동기화 — 새 노트·뉴스 md 한 개마다 노션 페이지 한 개를 만든다(키가 있을 때만).

필요: 환경변수 NOTION_TOKEN, NOTION_PARENT_PAGE_ID. 없으면 "건너뜀" 하고 정상 종료한다.
올린 파일은 data/notion_synced.json 에 기록해 다시 올리지 않는다.
실행: python automation/scripts/notion_sync.py [--root .] [--dry-run] [--selftest] [--limit 20]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

NOTION_VERSION = "2022-06-28"
MAX_BLOCKS = 100
MAX_TEXT = 2000
NEWS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.md$")


def rich(text: str) -> list[dict]:
    chunks = [text[i:i + MAX_TEXT] for i in range(0, len(text), MAX_TEXT)] or [""]
    return [{"type": "text", "text": {"content": c}} for c in chunks]


def block(kind: str, text: str) -> dict:
    return {"object": "block", "type": kind, kind: {"rich_text": rich(text)}}


def md_to_blocks(md: str) -> list[dict]:
    """제목(#)·불릿(-,*)·문단만 변환. frontmatter 는 버린다. 최대 100블록."""
    if md.startswith("---"):
        parts = md.split("---", 2)
        if len(parts) == 3:
            md = parts[2]
    blocks: list[dict] = []
    para: list[str] = []

    def flush():
        if para:
            blocks.append(block("paragraph", " ".join(para)))
            para.clear()

    for line in md.splitlines():
        s = line.rstrip()
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        b = re.match(r"^\s*[-*]\s+(.*)$", s)
        if m:
            flush()
            blocks.append(block(f"heading_{min(len(m.group(1)), 3)}", m.group(2)))
        elif b:
            flush()
            blocks.append(block("bulleted_list_item", b.group(1)))
        elif not s.strip():
            flush()
        else:
            para.append(s.strip().lstrip("> ").strip())
    flush()
    return blocks[:MAX_BLOCKS]


def title_of(md: str, fallback: str) -> str:
    m = re.search(r"^제목:\s*(.+)$", md, re.M) or re.search(r"^#\s+(.+)$", md, re.M)
    return (m.group(1).strip() if m else fallback)[:200]


def selftest() -> int:
    md = "---\na: b\n---\n# 제목\n\n본문 첫줄\n이어서\n\n- 하나\n* 둘\n## 소제목\n" + ("가" * 4500) + "\n"
    bl = md_to_blocks(md)
    kinds = [b["type"] for b in bl]
    assert kinds == ["heading_1", "paragraph", "bulleted_list_item", "bulleted_list_item", "heading_2", "paragraph"], kinds
    assert bl[1]["paragraph"]["rich_text"][0]["text"]["content"] == "본문 첫줄 이어서"
    assert len(bl[5]["paragraph"]["rich_text"]) == 3 and all(len(r["text"]["content"]) <= 2000 for r in bl[5]["paragraph"]["rich_text"])
    assert len(md_to_blocks("\n".join(f"- {i}" for i in range(300)))) == 100
    assert md_to_blocks("") == []
    print("selftest 통과")
    return 0


def api(method: str, path: str, token: str, body=None):
    req = urllib.request.Request("https://api.notion.com/v1" + path, method=method,
                                 data=json.dumps(body).encode("utf-8") if body is not None else None,
                                 headers={"Authorization": f"Bearer {token}", "Notion-Version": NOTION_VERSION, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="노션 동기화")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--limit", type=int, default=20, help="한 번에 올릴 최대 파일 수")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    token, parent = os.environ.get("NOTION_TOKEN", ""), os.environ.get("NOTION_PARENT_PAGE_ID", "")
    if not (token and parent) and not a.dry_run:
        print("노션 키 없음 → 건너뜀")
        return 0
    root = Path(a.root)
    rec = root / "data" / "notion_synced.json"
    try:
        done = set(json.loads(rec.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        done = set()
    files = []
    nd = root / "data" / "notes"
    if nd.is_dir():
        files += [f for f in sorted(nd.glob("*.md")) if not f.name.startswith("_")]
    wd = root / "data" / "news"
    if wd.is_dir():
        files += [f for f in sorted(wd.glob("*.md")) if NEWS_RE.match(f.name)]
    todo = [f for f in files if f.relative_to(root).as_posix() not in done][:a.limit]
    print(f"새로 올릴 파일 {len(todo)}개 (이미 올림 {len(done)}개)")
    for f in todo:
        rel = f.relative_to(root).as_posix()
        md = f.read_text(encoding="utf-8", errors="replace")
        blocks = md_to_blocks(md)
        if a.dry_run:
            print(f"[dry-run] {rel}: 블록 {len(blocks)}개")
            continue
        try:
            api("POST", "/pages", token, {"parent": {"page_id": parent},
                "properties": {"title": {"title": rich(title_of(md, f.stem))[:1]}}, "children": blocks})
            done.add(rel)
            print(f"올림: {rel}")
            time.sleep(0.4)
        except Exception as ex:
            print(f"경고: {rel} 실패({type(ex).__name__}) → 다음에 다시 시도")
    if not a.dry_run and todo:
        rec.write_text(json.dumps(sorted(done), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
