#!/usr/bin/env python3
"""옵시디언 내보내기 — data/ 의 뉴스·스크립트·노트를 data/obsidian/지식센터/ 로 그대로 복사하고 홈 노트를 만든다.

매번 폴더를 새로 만든다(여러 번 돌려도 결과 같음). 볼트에 통째로 넣어 쓰면 된다.
실행: python automation/scripts/export_obsidian.py [--root .]
의존성: 파이썬 표준 라이브러리만 사용.
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path
from zoneinfo import ZoneInfo
import datetime as dt

NEWS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.md$")


def frontmatter(text: str) -> str:
    return text.split("---", 2)[1] if text.startswith("---") and text.count("---") >= 2 else ""


def title_of(text: str, fallback: str) -> str:
    m = re.search(r"^제목:\s*(.+)$", frontmatter(text), re.M) or re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else fallback


def copy_md(src_dir: Path, dst: Path, pred=lambda p: True) -> list[Path]:
    dst.mkdir(parents=True, exist_ok=True)
    out = []
    if src_dir.is_dir():
        for f in sorted(src_dir.glob("*.md")):
            if pred(f):
                shutil.copy2(f, dst / f.name)
                out.append(f)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="옵시디언용 폴더 만들기")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    a = ap.parse_args(argv)
    root = Path(a.root)
    out = root / "data" / "obsidian" / "지식센터"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    news = copy_md(root / "data" / "news", out / "뉴스", lambda p: NEWS_RE.match(p.name) is not None)
    scripts = copy_md(root / "data" / "scripts", out / "스크립트")
    notes = copy_md(root / "data" / "notes", out / "노트", lambda p: not p.name.startswith("_"))

    try:
        now = dt.datetime.now(ZoneInfo("Asia/Seoul"))
    except Exception:
        now = dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))

    lines = ["---", "type: home", "tags: [지식센터, 홈]", f"updated: {now.strftime('%Y-%m-%d %H:%M')}", "---",
             "# 지식센터 홈", "", f"뉴스 {len(news)}개 · 스크립트 {len(scripts)}개 · 노트 {len(notes)}개", "", "## 최근 뉴스 (최신 14개)"]
    for f in news[-14:][::-1]:
        lines.append(f"- [[뉴스/{f.stem}|{f.stem}]]")
    if not news:
        lines.append("- (아직 없음)")

    groups: dict[str, list[str]] = {"상": [], "중": [], "하": [], "미분류": []}
    for f in notes:
        t = f.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"^활용가치:\s*(\S+)", frontmatter(t), re.M)
        g = m.group(1) if m and m.group(1) in groups else "미분류"
        groups[g].append(f"- [[노트/{f.stem}|{title_of(t, f.stem)}]]")
    lines += ["", "## 노트 (활용가치별)"]
    for g, label in (("상", "활용가치 상"), ("중", "활용가치 중"), ("하", "활용가치 하"), ("미분류", "미분류")):
        if groups[g]:
            lines += ["", f"### {label} ({len(groups[g])})"] + groups[g]
    if not notes:
        lines.append("- (아직 없음)")
    (out / "지식센터 홈.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"내보냄: 뉴스 {len(news)} · 스크립트 {len(scripts)} · 노트 {len(notes)} → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
