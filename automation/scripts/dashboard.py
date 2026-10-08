#!/usr/bin/env python3
"""현황판 — 모델 호출 없이 data/ 를 훑어 status.json 과 현황판.html 을 만든다.

보는 것: 뉴스 파일 수·최신 날짜·출처 성공 수, 영상 스크립트 수(목표 300), 가공 노트 수,
         '멈춤 감시'(최신 뉴스가 이틀보다 더 오래되면 멈춤 의심).
실행: python automation/scripts/dashboard.py [--root .] [--today 2026-10-20]
의존성: 파이썬 표준 라이브러리만 사용.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

GOAL = 300
NEWS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.md$")


def kst_now() -> dt.datetime:
    try:
        return dt.datetime.now(ZoneInfo("Asia/Seoul"))
    except Exception:  # tzdata 없는 환경
        return dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def news_info(news_dir: Path) -> dict:
    files = sorted(f for f in news_dir.glob("*.md") if NEWS_RE.match(f.name)) if news_dir.is_dir() else []
    info = {"files": len(files), "latest_date": None, "items": 0, "sources_ok": 0, "sources_total": 0,
            "recent_dates": [f.stem for f in files[-7:]][::-1]}
    if not files:
        return info
    last = files[-1]
    text = read(last)
    info["latest_date"] = last.stem
    m = re.search(r"^count:\s*(\d+)", text, re.M)
    if m:
        info["items"] = int(m.group(1))
    else:
        info["items"] = len(re.findall(r"^- \[", text, re.M))
    sec = text.split("## 수집 상태", 1)
    if len(sec) == 2:
        for line in sec[1].splitlines():
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 2 and line.strip().startswith("|") and cells[0] not in ("소스", "---") and not set(cells[0]) <= {"-", ":"}:
                info["sources_total"] += 1
                if cells[1] == "성공":
                    info["sources_ok"] += 1
    return info


def scripts_count(csv_path: Path) -> int:
    if not csv_path.is_file():
        return 0
    try:
        with csv_path.open(encoding="utf-8", newline="") as f:
            return sum(1 for r in csv.DictReader(f) if (r.get("video_id") or "").strip())
    except (OSError, csv.Error):
        return 0


def notes_info(notes_dir: Path) -> dict:
    info = {"count": 0, "jev_pass": 0, "high_value": 0}
    if not notes_dir.is_dir():
        return info
    for f in notes_dir.glob("*.md"):
        text = read(f)
        fm = text.split("---", 2)[1] if text.startswith("---") and text.count("---") >= 2 else ""
        info["count"] += 1
        if re.search(r"^jev:\s*통과", fm, re.M):
            info["jev_pass"] += 1
        if re.search(r"^활용가치:\s*상", fm, re.M):
            info["high_value"] += 1
    return info


def build_status(root: Path, today: dt.date, now: dt.datetime) -> dict:
    data = root / "data"
    news = news_info(data / "news")
    sc = scripts_count(data / "scripts" / "index.csv")
    notes = notes_info(data / "notes")
    problems: list[str] = []
    if not news["latest_date"]:
        problems.append("뉴스 파일이 하나도 없습니다.")
    else:
        latest = dt.date.fromisoformat(news["latest_date"])
        age = (today - latest).days
        news["days_old"] = max(age, 0)
        if age > 2:
            problems.append(f"최신 뉴스가 {news['latest_date']} 날짜로 {age}일째 새로 안 쌓이고 있습니다.")
        if news["sources_total"] and news["sources_ok"] < news["sources_total"] // 2:
            problems.append(f"뉴스 출처 {news['sources_total']}곳 중 {news['sources_ok']}곳만 성공했습니다.")
    return {
        "generated_at": now.strftime("%Y-%m-%d %H:%M"),
        "timezone": "KST",
        "today": today.isoformat(),
        "stale": bool(problems),
        "problems": problems,
        "news": news,
        "scripts": {"count": sc, "goal": GOAL},
        "notes": notes,
    }


CSS = """
:root{--bg:#f6f7f9;--card:#fff;--text:#1b1f24;--sub:#5b6570;--line:#e2e6ea;--ok:#15803d;--bad:#b91c1c;--bar:#2563eb;--track:#e5e9ee}
@media (prefers-color-scheme:dark){:root{--bg:#12161b;--card:#1b2128;--text:#eef1f4;--sub:#9aa6b2;--line:#2b333c;--ok:#4ade80;--bad:#f87171;--bar:#60a5fa;--track:#2b333c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,"Malgun Gothic","Apple SD Gothic Neo",sans-serif;line-height:1.5}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.5rem;margin:0 0 4px}.sub{color:var(--sub);font-size:.9rem;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.tile .label{color:var(--sub);font-size:.95rem}.tile .big{font-size:2.4rem;font-weight:700;line-height:1.2;margin:4px 0}
.tile .note{color:var(--sub);font-size:.85rem}
.ok{color:var(--ok)}.bad{color:var(--bad)}
.bar{height:10px;border-radius:5px;background:var(--track);overflow:hidden;margin-top:8px}.bar>i{display:block;height:100%;background:var(--bar)}
.wide{grid-column:1/-1}ul{margin:8px 0 0;padding-left:20px}
"""


def render_html(s: dict) -> str:
    e = html.escape
    n, sc, nt = s["news"], s["scripts"], s["notes"]
    pct = min(100, round(sc["count"] * 100 / sc["goal"])) if sc["goal"] else 0
    if s["stale"]:
        state = '<div class="big bad">멈춤 의심</div><ul>' + "".join(f"<li>{e(p)}</li>" for p in s["problems"]) + "</ul>"
    else:
        state = '<div class="big ok">정상</div><div class="note">자동 수집이 제때 돌고 있습니다.</div>'
    latest = e(n["latest_date"] or "없음")
    recent = ", ".join(e(d) for d in n["recent_dates"]) or "없음"
    total = n["sources_total"] or 11
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>지식센터 현황판</title><style>{CSS}</style></head><body><main>
<h1>지식센터 현황판</h1>
<p class="sub">만든 시각 {e(s['generated_at'])} (한국시간) · 가장 최근 뉴스 날짜 {latest}</p>
<div class="grid">
<div class="tile wide"><div class="label">상태</div>{state}</div>
<div class="tile"><div class="label">오늘 뉴스 몇 건</div><div class="big">{n['items']}건</div><div class="note">{latest} 기준</div></div>
<div class="tile"><div class="label">출처 성공</div><div class="big">{n['sources_ok']}/{total}</div><div class="note">뉴스를 가져온 곳 수</div></div>
<div class="tile"><div class="label">영상 스크립트</div><div class="big">{sc['count']}/{sc['goal']}</div><div class="bar"><i style="width:{pct}%"></i></div><div class="note">목표의 {pct}%</div></div>
<div class="tile"><div class="label">가공된 노트</div><div class="big">{nt['count']}개</div><div class="note">검수 통과 {nt['jev_pass']}개 · 활용가치 상 {nt['high_value']}개</div></div>
<div class="tile wide"><div class="label">최근 뉴스 날짜 (모아둔 파일 {n['files']}개)</div><div class="note">{recent}</div></div>
</div></main></body></html>
"""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="현황판 만들기")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--today", help="테스트용 오늘 날짜 YYYY-MM-DD")
    a = ap.parse_args(argv)
    root = Path(a.root)
    now = kst_now()
    today = dt.date.fromisoformat(a.today) if a.today else now.date()
    s = build_status(root, today, now)
    (root / "data").mkdir(parents=True, exist_ok=True)
    (root / "data" / "status.json").write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "data" / "현황판.html").write_text(render_html(s), encoding="utf-8")
    print(f"stale={str(s['stale']).lower()} 뉴스파일={s['news']['files']} 최신={s['news']['latest_date']} "
          f"출처={s['news']['sources_ok']}/{s['news']['sources_total']} 스크립트={s['scripts']['count']}/{GOAL} 노트={s['notes']['count']}")
    for p in s["problems"]:
        print("문제:", p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
