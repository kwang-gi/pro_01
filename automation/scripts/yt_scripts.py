#!/usr/bin/env python3
"""영상 스크립트 수집기 — 모델 호출 없이(비용 0) 유튜브 자막을 대량으로 받아 md로 저장한다.

흐름: config/yt_targets.json(검색어·채널) → yt-dlp로 영상 목록 → 자막(ko→en, 수동→자동 순) 받기
     → 타임스탬프 정리한 본문을 data/scripts/<영상ID>.md 로 저장 → data/scripts/index.csv 누적.

실행: pip install yt-dlp && python automation/scripts/yt_scripts.py [--limit 30] [--dry-run]
주의: 유튜브는 데이터센터 IP(클라우드·깃허브 액션)를 자주 막는다. 막히면 실장님 PC에서 같은 명령으로 돌린다.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "automation" / "config" / "yt_targets.json"
KST = dt.timezone(dt.timedelta(hours=9))
FIELDS = ["video_id", "title", "channel", "upload_date", "duration_min", "lang", "query", "url", "collected_at", "chars"]


def ytdlp(*args: str) -> subprocess.CompletedProcess:
    exe = shutil.which("yt-dlp")
    cmd = [exe] if exe else [sys.executable, "-m", "yt_dlp"]
    return subprocess.run(cmd + list(args), capture_output=True, text=True, timeout=300)


def list_videos(source: str, n: int) -> list[dict]:
    """검색어면 ytsearchN:, URL이면 채널/재생목록으로 보고 앞에서 n개."""
    target = source if source.startswith("http") else f"ytsearch{n}:{source}"
    r = ytdlp("--flat-playlist", "--playlist-end", str(n), "-J", target)
    if r.returncode != 0:
        raise RuntimeError((r.stderr.strip().splitlines() or ["yt-dlp 실패"])[-1][:160])
    data = json.loads(r.stdout)
    return [e for e in data.get("entries", []) if e and e.get("id")]


def vtt_to_text(vtt: str) -> str:
    """VTT 자막 → 중복 줄 제거한 본문. [mm:ss] 표시를 30초마다 넣는다."""
    out, last, last_mark = [], "", -30
    t = 0
    for line in vtt.splitlines():
        m = re.match(r"(\d+):(\d+):(\d+)\.\d+ -->", line) or re.match(r"(\d+):(\d+)\.\d+ -->", line)
        if m:
            g = [int(x) for x in m.groups()]
            t = g[0] * 3600 + g[1] * 60 + g[2] if len(g) == 3 else g[0] * 60 + g[1]
            continue
        if not line.strip() or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")) or "-->" in line:
            continue
        text = re.sub(r"<[^>]+>", "", line).strip()
        if not text or text == last:
            continue
        if t - last_mark >= 30:
            out.append(f"\n[{t // 60:02d}:{t % 60:02d}] ")
            last_mark = t
        out.append(text + " ")
        last = text
    return "".join(out).strip()


def fetch_transcript(video_id: str, langs: list[str]) -> tuple[dict, str, str]:
    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmp:
        r = ytdlp("--skip-download", "--write-subs", "--write-auto-subs", "--sub-langs", ",".join(langs),
                  "--sub-format", "vtt", "--write-info-json", "-o", f"{tmp}/%(id)s.%(ext)s", url)
        info_p = Path(tmp) / f"{video_id}.info.json"
        if not info_p.exists():
            raise RuntimeError((r.stderr.strip().splitlines() or ["정보 없음"])[-1][:160])
        info = json.loads(info_p.read_text(encoding="utf-8"))
        for lang in langs:
            for p in Path(tmp).glob(f"{video_id}.{lang}*.vtt"):
                return info, lang, vtt_to_text(p.read_text(encoding="utf-8"))
    return info, "", ""


def load_index(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return {row["video_id"]: row for row in csv.DictReader(f)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "data" / "scripts"))
    ap.add_argument("--limit", type=int, help="이번 실행에서 새로 받을 최대 개수")
    ap.add_argument("--dry-run", action="store_true", help="목록만 뽑고 자막은 받지 않음")
    args = ap.parse_args()

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    limit = args.limit or cfg.get("max_new_per_run", 30)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    index_path = out / "index.csv"
    index = load_index(index_path)

    candidates: list[tuple[str, dict]] = []
    sources = [(q, cfg.get("per_query", 5)) for q in cfg.get("queries", [])] + \
              [(c, cfg.get("per_channel", 5)) for c in cfg.get("channels", [])]
    errors = []
    for src, n in sources:
        try:
            for e in list_videos(src, n):
                if e["id"] not in index and all(e["id"] != c[1]["id"] for c in candidates):
                    candidates.append((src, e))
        except Exception as ex:
            errors.append(f"목록 실패 [{src}]: {ex}")

    print(f"[yt_scripts] 새 후보 {len(candidates)}개 (기존 {len(index)}개), 이번 한도 {limit}")
    if args.dry_run:
        for src, e in candidates[:limit]:
            print(f"  - {e['id']} | {e.get('title')} | {src}")
        for er in errors:
            print("  ! " + er)
        return 0 if candidates or not errors else 1

    added = tried = 0
    for src, e in candidates:
        if added >= limit or tried >= limit * 2:  # 실패가 이어져도 한도의 2배까지만 시도
            break
        tried += 1
        vid = e["id"]
        try:
            info, lang, text = fetch_transcript(vid, cfg.get("langs", ["ko", "en"]))
        except Exception as ex:
            errors.append(f"자막 실패 [{vid}]: {ex}")
            if "not a bot" in str(ex):  # 유튜브가 이 IP를 막음 → 더 시도해도 같은 결과
                errors.append("유튜브가 이 실행 환경(IP)을 봇으로 막음 — PC에서 실행하세요")
                break
            continue
        if not text:
            errors.append(f"자막 없음 [{vid}] {e.get('title')}")
            continue
        row = {
            "video_id": vid, "title": info.get("title", ""), "channel": info.get("channel", ""),
            "upload_date": info.get("upload_date", ""), "duration_min": round((info.get("duration") or 0) / 60, 1),
            "lang": lang, "query": src, "url": f"https://www.youtube.com/watch?v={vid}",
            "collected_at": dt.datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "chars": len(text),
        }
        title_safe = row["title"].replace('"', "'")
        (out / f"{vid}.md").write_text(
            "---\n" + f'title: "{title_safe}"\n' + f"channel: {row['channel']}\n" + f"url: {row['url']}\n"
            + f"upload_date: {row['upload_date']}\nlang: {lang}\nquery: {src}\ntype: script-raw\n"
            + "tags: [스크립트, 자동수집]\n---\n" + f"# {row['title']}\n\n{text}\n", encoding="utf-8")
        index[vid] = row
        added += 1
        print(f"  + {vid} ({lang}, {len(text)}자) {row['title'][:60]}")

    with index_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(index.values())
    for er in errors:
        print("  ! " + er)
    print(f"[yt_scripts] 새로 저장 {added}개, 누적 {len(index)}개 / 목표 300")
    return 0 if added or not errors else 1


if __name__ == "__main__":
    sys.exit(main())
