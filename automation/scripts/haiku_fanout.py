#!/usr/bin/env python3
"""하이쿠 분업기 — jev 기준서(캐싱) + Claude Haiku 5.5 병렬 작업자로 스크립트를 노트로 가공한다.

흐름: data/scripts/*.md 중 아직 노트가 없는 것 → 작업자 N명이 병렬로 하나씩 처리
     (system = jev 기준서, cache_control로 고정 → 2번째 호출부터 90% 할인)
     → 스크립트가 JSON 규격(J1~J3)을 기계 채점 → 실패분만 1회 재시도
     → data/notes/<영상ID>.md + data/notes/_run_<시각>.json(토큰·비용 기록).

실행: pip install anthropic && ANTHROPIC_API_KEY=... python automation/scripts/haiku_fanout.py --limit 10
      키 없이 --dry-run 이면 처리 대상과 예상 비용만 계산한다.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUBRIC = ROOT / "automation" / "jev" / "스크립트분석_기준서.md"
MODEL = "claude-haiku-5-5"
# 달러 / 100만 토큰 (100K 이하 프롬프트 기준). 캐시 쓰기 1.25배, 읽기 0.1배.
PRICE = {"in": 0.10, "out": 0.50, "cache_write": 0.125, "cache_read": 0.01}
REQUIRED = ["제목", "한줄요약", "분류", "핵심기술", "활용사례", "따라하기절차", "실패조건", "우리적용", "신뢰도", "판정"]
KST = dt.timezone(dt.timedelta(hours=9))


def jev_check(d: dict) -> list[str]:
    """jev 채점표 중 기계로 볼 수 있는 J1~J3. 빈 리스트면 통과."""
    errs = [f"J1 키 없음: {k}" for k in REQUIRED if k not in d]
    if len(str(d.get("한줄요약", ""))) > 80:
        errs.append("J2 한줄요약 80자 초과")
    if d.get("분류") in ("기본", "응용"):
        steps = d.get("따라하기절차") or []
        if len(steps) < 3:
            errs.append("J3 절차 3단계 미만")
        elif any(not s.get("근거시각") for s in steps if isinstance(s, dict)):
            errs.append("J3 근거시각 없음")
    return errs


def parse_json(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("JSON 없음")
    return json.loads(m.group(0))


def work(client, rubric: str, path: Path) -> dict:
    body = path.read_text(encoding="utf-8")
    usage = {"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}
    feedback, result, errs = "", None, ["미실행"]
    for attempt in range(2):  # 실패분만 1회 재작업
        msg = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            output_config={"effort": "low"},
            system=[{"type": "text", "text": rubric, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"다음 스크립트를 기준서대로 처리해 JSON만 출력하라.{feedback}\n\n{body}"}],
        )
        for k in usage:
            usage[k] += getattr(msg.usage, k, 0) or 0
        text = "".join(b.text for b in msg.content if b.type == "text")
        try:
            result = parse_json(text)
            errs = jev_check(result)
        except Exception as ex:
            result, errs = None, [f"J1 파싱 실패: {ex}"]
        if not errs:
            break
        feedback = "\n이전 출력이 기준서를 어겼다: " + "; ".join(errs) + ". 고쳐서 다시 출력하라."
    return {"file": path, "result": result, "errors": errs, "usage": usage}


def to_markdown(vid: str, src: str, d: dict, errs: list[str]) -> str:
    lines = ["---", f"source: {vid}", f"type: note", f"분류: {d.get('분류', '')}", f"판정: {d.get('판정', '')}",
             f"jev: {'통과' if not errs else '실패 ' + '; '.join(errs)}", "tags: [노트, 하이쿠가공]", "---",
             f"# {d.get('제목', vid)}", "", f"> {d.get('한줄요약', '')}", "", f"원본: [[{src}]]", "",
             "## 핵심 기술", *[f"- {t}" for t in d.get("핵심기술", [])], "", "## 활용 사례"]
    for c in d.get("활용사례", []):
        lines.append(f"- **{c.get('상황', '')}** — {c.get('방법', '')} → {c.get('효과', '')}")
    lines += ["", "## 따라 하기"]
    for s in d.get("따라하기절차", []):
        lines.append(f"{s.get('단계', '')}. {s.get('할일', '')} {s.get('근거시각', '')}")
    lines += ["", "## 실패 조건", *[f"- {f}" for f in d.get("실패조건", [])], "", "## 우리 적용", d.get("우리적용", ""), ""]
    return "\n".join(lines)


def cost(u: dict) -> float:
    return (u["input_tokens"] * PRICE["in"] + u["output_tokens"] * PRICE["out"]
            + u["cache_creation_input_tokens"] * PRICE["cache_write"] + u["cache_read_input_tokens"] * PRICE["cache_read"]) / 1e6


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scripts", default=str(ROOT / "data" / "scripts"))
    ap.add_argument("--out", default=str(ROOT / "data" / "notes"))
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rubric = RUBRIC.read_text(encoding="utf-8")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    todo = [p for p in sorted(Path(args.scripts).glob("*.md")) if not (out / p.name).exists()][: args.limit]
    est_in = sum(len(p.read_text(encoding="utf-8")) for p in todo) // 2  # 한글 대략 2자=1토큰
    rub_tok = len(rubric) // 2
    est = {"input_tokens": est_in, "output_tokens": 1200 * len(todo),
           "cache_creation_input_tokens": rub_tok if todo else 0, "cache_read_input_tokens": rub_tok * max(len(todo) - 1, 0)}
    print(f"[haiku_fanout] 대상 {len(todo)}개, 기준서 약 {rub_tok}토큰, 예상 비용 ${cost(est):.4f} (캐싱 적용, 재시도 제외)")
    if args.dry_run or not todo:
        return 0
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY 없음 — --dry-run 으로만 실행 가능")
        return 2

    import anthropic

    client = anthropic.Anthropic()
    total = {k: 0 for k in est}
    report = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(work, client, rubric, p) for p in todo]
        for f in as_completed(futs):
            r = f.result()
            for k in total:
                total[k] += r["usage"][k]
            name = r["file"].name
            if r["result"]:
                (out / name).write_text(to_markdown(r["file"].stem, r["file"].stem, r["result"], r["errors"]), encoding="utf-8")
            report.append({"file": name, "jev_errors": r["errors"], "usage": r["usage"]})
            print(f"  {'✓' if not r['errors'] else '✗'} {name} {r['errors'] or ''}")
    passed = sum(1 for r in report if not r["jev_errors"])
    stamp = dt.datetime.now(KST).strftime("%Y%m%d-%H%M")
    (out / f"_run_{stamp}.json").write_text(json.dumps(
        {"model": MODEL, "total_usage": total, "cost_usd": round(cost(total), 5), "passed": passed, "items": report},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[haiku_fanout] jev 통과 {passed}/{len(report)}, 실제 비용 ${cost(total):.4f}, 캐시 읽기 {total['cache_read_input_tokens']}토큰")
    return 0


if __name__ == "__main__":
    sys.exit(main())
