#!/usr/bin/env python3
"""알림 — data/status.json 을 짧은 한국어로 요약해 디스코드·깃허브 이슈로 알린다(무료).

- DISCORD_WEBHOOK_URL 이 있으면 디스코드로 보낸다(주소는 절대 출력하지 않음).
- 멈춤 상태이고 GITHUB_TOKEN·GITHUB_REPOSITORY 가 있으면 "자동화 멈춤 알림" 이슈를 열거나 댓글을 단다
  (이슈 알림이 이메일·앱으로 온다). 정상으로 돌아오면 댓글 후 닫는다.
- 네트워크 오류가 나도 경고만 출력하고 항상 성공(0)으로 끝낸다.
실행: python automation/scripts/notify.py [--root .] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ISSUE_TITLE = "자동화 멈춤 알림"


def summarize(s: dict) -> str:
    n, sc, nt = s.get("news", {}), s.get("scripts", {}), s.get("notes", {})
    head = "⚠️ 자동화 멈춤 의심" if s.get("stale") else "✅ 자동화 정상"
    l1 = f"{head} ({s.get('generated_at', '?')} 한국시간)"
    l2 = f"뉴스 {n.get('latest_date') or '없음'} {n.get('items', 0)}건, 출처 성공 {n.get('sources_ok', 0)}/{n.get('sources_total', 0)}"
    l3 = f"영상 스크립트 {sc.get('count', 0)}/{sc.get('goal', 300)}, 가공 노트 {nt.get('count', 0)}개"
    return "\n".join([l1, l2, l3])


def http(method: str, url: str, body=None, headers=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", "User-Agent": "pro01-notify", **(headers or {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip().startswith(("{", "[")) else raw


def notify_discord(summary: str, dry: bool) -> None:
    url = os.environ.get("DISCORD_WEBHOOK_URL", "")
    if not url:
        print("디스코드: 주소 없음 → 건너뜀")
        return
    if dry:
        print("[dry-run] 디스코드로 보낼 내용:\n" + summary)
        return
    try:
        http("POST", url, {"content": summary})
        print("디스코드: 보냄")
    except Exception as ex:  # 주소가 담긴 메시지는 출력하지 않음
        print(f"경고: 디스코드 전송 실패({type(ex).__name__})")


def handle_issue(s: dict, summary: str, dry: bool) -> None:
    token, repo = os.environ.get("GITHUB_TOKEN", ""), os.environ.get("GITHUB_REPOSITORY", "")
    stale = bool(s.get("stale"))
    body = summary + ("\n\n문제:\n" + "\n".join(f"- {p}" for p in s.get("problems", [])) if s.get("problems") else "")
    if not (token and repo):
        print("깃허브 이슈: 토큰/저장소 없음 → 건너뜀")
        return
    if dry:
        if stale:
            print(f"[dry-run] 이슈 '{ISSUE_TITLE}' 을 찾아 없으면 만들고, 있으면 댓글:\n{body}")
        else:
            print(f"[dry-run] 열린 이슈 '{ISSUE_TITLE}' 가 있으면 '정상으로 돌아옴' 댓글 후 닫음")
        return
    h = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    api = f"https://api.github.com/repos/{repo}"
    try:
        issues = http("GET", f"{api}/issues?state=open&per_page=100", headers=h)
        found = next((i for i in issues if i.get("title") == ISSUE_TITLE and "pull_request" not in i), None)
        if stale:
            if found:
                http("POST", f"{api}/issues/{found['number']}/comments", {"body": body}, h)
                print(f"깃허브 이슈 #{found['number']}: 댓글 추가")
            else:
                r = http("POST", f"{api}/issues", {"title": ISSUE_TITLE, "body": body}, h)
                print(f"깃허브 이슈 #{r.get('number')}: 새로 만듦")
        elif found:
            http("POST", f"{api}/issues/{found['number']}/comments", {"body": "정상으로 돌아옴\n\n" + summary}, h)
            http("PATCH", f"{api}/issues/{found['number']}", {"state": "closed", "state_reason": "completed"}, h)
            print(f"깃허브 이슈 #{found['number']}: 정상 복귀, 닫음")
        else:
            print("깃허브 이슈: 정상, 열린 알림 없음")
    except Exception as ex:
        print(f"경고: 깃허브 이슈 처리 실패({type(ex).__name__}: {str(ex)[:80]})")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="멈춤 알림 보내기")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--dry-run", action="store_true", help="네트워크 없이 할 일만 출력")
    a = ap.parse_args(argv)
    p = Path(a.root) / "data" / "status.json"
    try:
        s = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        print("status.json 없음 → 건너뜀 (먼저 dashboard.py 실행)")
        return 0
    summary = summarize(s)
    print(summary)
    notify_discord(summary, a.dry_run)
    handle_issue(s, summary, a.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
