#!/usr/bin/env python3
"""뉴스 레이더 — 모델 호출 없이(비용 0) AI·자동화 소식을 모아 하루치 md로 저장한다.

흐름: 수집처(config/news_sources.json) 읽기 → 소스별 수집 → 키워드 필터 → 이전 수집분과 중복 제거
     → data/news/YYYY-MM-DD.md (+ 옵시디언용 frontmatter) 와 data/news/seen.json 갱신.

실행: python automation/scripts/news_radar.py [--out data/news] [--date 2026-10-08]
의존성: 파이썬 표준 라이브러리만 사용.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "automation" / "config" / "news_sources.json"
KST = dt.timezone(dt.timedelta(hours=9))
UA = "Mozilla/5.0 (news-radar; +https://github.com/kwang-gi/pro_01)"


def fetch(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def parse_rss(text: str) -> list[dict]:
    """RSS 2.0 과 Atom 모두 처리."""
    root = ET.fromstring(text)
    items = []
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag not in ("item", "entry"):
            continue
        get = {c.tag.split("}")[-1]: c for c in el}
        title = strip_tags(get["title"].text if "title" in get else "")
        link = ""
        if "link" in get:
            link = get["link"].get("href") or (get["link"].text or "")
        summary = ""
        for k in ("description", "summary", "content"):
            if k in get and get[k].text:
                summary = strip_tags(get[k].text)[:300]
                break
        date = ""
        for k in ("pubDate", "published", "updated"):
            if k in get and get[k].text:
                date = get[k].text.strip()
                break
        items.append({"title": title, "url": link.strip(), "summary": summary, "date": date})
    return items


def parse_html_links(text: str, src: dict) -> list[dict]:
    seen, items = set(), []
    for path in re.findall(src["pattern"], text):
        if path in seen:
            continue
        seen.add(path)
        slug = path.rstrip("/").split("/")[-1]
        items.append({"title": slug.replace("-", " ").capitalize(), "url": src["base"] + path, "summary": "", "date": ""})
    return items[:15]


def parse_changelog(text: str, src: dict) -> list[dict]:
    m = re.search(r"^## (\S+)\n(.*?)(?=^## )", text, re.S | re.M)
    if not m:
        return []
    ver, body = m.group(1), m.group(2)
    added = [l[2:] for l in body.splitlines() if l.startswith("- Added")][:6]
    return [{
        "title": f"Claude Code {ver}",
        "url": "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
        "summary": " / ".join(added)[:600] or body.strip()[:400],
        "date": "",
        "key": f"claude-code-{ver}",
    }]


def parse_hn(text: str) -> list[dict]:
    out = []
    for h in json.loads(text).get("hits", [])[:15]:
        url = h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}"
        out.append({"title": h.get("title", ""), "url": url, "summary": f"HN {h.get('points', 0)}점, 댓글 {h.get('num_comments', 0)}개", "date": h.get("created_at", "")})
    return out


def collect(src: dict) -> list[dict]:
    text = fetch(src["url"])
    t = src["type"]
    if t == "rss":
        return parse_rss(text)
    if t == "html_links":
        return parse_html_links(text, src)
    if t == "changelog_md":
        return parse_changelog(text, src)
    if t == "hn":
        return parse_hn(text)
    raise ValueError(f"알 수 없는 type: {t}")


def matches(item: dict, keywords: list[str]) -> bool:
    blob = f"{item['title']} {item['summary']}".lower()
    return any(k.lower() in blob for k in keywords)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "data" / "news"))
    ap.add_argument("--date", default=dt.datetime.now(KST).strftime("%Y-%m-%d"))
    ap.add_argument("--max-per-source", type=int, default=8)
    args = ap.parse_args()

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    seen_path = out / "seen.json"
    seen = set(json.loads(seen_path.read_text(encoding="utf-8"))) if seen_path.exists() else set()

    sections, status = [], []
    for src in cfg["sources"]:
        try:
            items = collect(src)
        except Exception as e:  # 한 소스가 막혀도 나머지는 계속
            status.append(f"| {src['name']} | 실패 | {type(e).__name__}: {str(e)[:60]} |")
            continue
        fresh = []
        for it in items:
            key = it.get("key") or it["url"]
            if not it["url"] or key in seen:
                continue
            if not src.get("always") and not matches(it, cfg["keywords"]):
                continue
            seen.add(key)
            fresh.append(it)
            if len(fresh) >= args.max_per_source:
                break
        status.append(f"| {src['name']} | 성공 | 받은 {len(items)}건 → 새 소식 {len(fresh)}건 |")
        if fresh:
            sections.append((src["name"], fresh))

    total = sum(len(f) for _, f in sections)
    lines = [
        "---",
        f"date: {args.date}",
        "type: news-raw",
        "tags: [뉴스, 자동수집]",
        f"count: {total}",
        "---",
        f"# 뉴스 레이더 원자료 — {args.date}",
        "",
        "> 모델 없이 스크립트가 모은 원자료입니다. 요약·판단은 아침 루틴(Claude)이 이 파일만 읽어서 합니다.",
        "",
    ]
    for name, items in sections:
        lines.append(f"## {name}")
        for it in items:
            lines.append(f"- [{it['title'] or it['url']}]({it['url']})" + (f" — {it['summary']}" if it["summary"] else ""))
        lines.append("")
    lines += ["## 수집 상태", "| 소스 | 결과 | 내용 |", "|---|---|---|", *status, ""]

    day_file = out / f"{args.date}.md"
    day_file.write_text("\n".join(lines), encoding="utf-8")
    seen_path.write_text(json.dumps(sorted(seen), ensure_ascii=False, indent=0), encoding="utf-8")
    ok = sum(1 for s in status if "| 성공 |" in s)
    print(f"[news_radar] {day_file} 저장 — 새 소식 {total}건, 소스 {ok}/{len(status)} 성공")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
