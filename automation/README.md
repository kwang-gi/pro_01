# automation — 지시 없이 도는 무료 자동화

| 구성 | 파일 | 언제 | 비용 |
|---|---|---|---|
| 뉴스 레이더 | `scripts/news_radar.py` + `config/news_sources.json` | 매일 06:20 KST (GitHub Actions) | 0원 (모델 안 씀) |
| 영상 스크립트 수집 | `scripts/yt_scripts.py` + `config/yt_targets.json` | 월·목 06:35 KST | 0원 (모델 안 씀) |
| 하이쿠 가공 | `scripts/haiku_fanout.py` + `jev/스크립트분석_기준서.md` | 수집 직후, API 키 있을 때만 | 영상 1개 약 $0.0005~0.001 (캐싱) |
| 현황판 | `scripts/dashboard.py` | 뉴스 직후 매일 | 0원 (모델 안 씀) |
| 옵시디언 폴더 | `scripts/export_obsidian.py` | 뉴스 직후 매일 | 0원 |
| 노션 동기화 | `scripts/notion_sync.py` | 뉴스 직후 매일, 노션 키 있을 때만 | 0원 |
| 멈춤 알림 | `scripts/notify.py` | 뉴스 직후 매일 | 0원 |
| PC 자동 받기 | `pc/옵시디언_자동받기.ps1` | 내 PC에서 매일 07:30 (등록 필요) | 0원 |

결과는 저장소 `data/` 에 쌓인다: `data/news/날짜.md`, `data/scripts/<영상ID>.md`·`index.csv`, `data/notes/<영상ID>.md`.
모든 md에 옵시디언용 frontmatter(tags 등)가 있어서 그대로 지식센터 볼트에 넣을 수 있다.

## 바꾸고 싶을 때
- 뉴스 출처·키워드: `config/news_sources.json` 만 고친다.
- 영상 검색어·채널: `config/yt_targets.json` 의 `queries`, `channels`.
- 가공 기준: `jev/스크립트분석_기준서.md` (바꾸면 캐시가 새로 만들어지므로 묶어서 수정).

## 직접 돌려보기 (PC)
```bash
python automation/scripts/news_radar.py
pip install yt-dlp && python automation/scripts/yt_scripts.py --limit 5
pip install anthropic && set ANTHROPIC_API_KEY=... && python automation/scripts/haiku_fanout.py --limit 5
```
`--dry-run` 을 붙이면 저장 없이 대상과 예상 비용만 보여준다.

## 검증 방법
1. PR을 올리면 Actions가 세 스크립트를 실제로 돌리고 결과를 아티팩트(news, scripts)로 남긴다.
2. 뉴스: `data/news/날짜.md` 맨 아래 "수집 상태" 표에서 소스별 성공/실패 확인.
3. 스크립트: 실행 로그의 `새로 저장 N개, 누적 M개 / 목표 300`.
4. 가공: `data/notes/_run_*.json` 의 `passed`(jev 통과 수), `cost_usd`, `cache_read_input_tokens`(0이면 캐싱 안 된 것).

## 구독(무료)으로 하이쿠 돌리기
API 키 없이 Max 구독만으로 Claude Code 안에서 하이쿠 분업을 돌리는 경로다. 서브에이전트 두 개와 루틴 두 개로 구성된다.

| 구성 | 파일 | 역할 |
|---|---|---|
| 서브에이전트 | `.claude/agents/jev-script-analyst.md` | haiku. 시스템 프롬프트 = jev 기준서 전문(고정 prefix). 스크립트 1개 → `data/notes/<id>.md` |
| 서브에이전트 | `.claude/agents/news-brief.md` | haiku. 레이더 원본 → `data/news/날짜.brief.md` (핵심 3줄·주제별·정할 일) |
| 루틴 | `routines/process-scripts.md` | 노트 없는 스크립트 최대 30개를 병렬 가공 → 기계 검사 → 실패분 1회 재시도 → 초안 PR |
| 루틴 | `routines/morning-news.md` | 오늘 브리프 생성 → `/mnt/project-files/news/`에 복사 → 핵심 3줄 답장 |

- 루틴 파일의 내용을 예약 Claude 루틴의 프롬프트로 그대로 붙여 넣는다.
- 기준서(`jev/스크립트분석_기준서.md`)를 고치면 `jev-script-analyst.md` 안의 사본도 같이 고쳐야 한다.
- `scripts/haiku_fanout.py` 는 그대로 남는다. API 키가 있을 때 쓰는 경로이고, 위 방식은 구독 한도 안에서 돈다.

## 현황판·알림·옵시디언·노션 (모두 무료)
- **현황판**: `data/현황판.html` 을 열면 오늘 뉴스 몇 건, 출처 성공 몇 곳, 영상 스크립트 몇 개(목표 300), 가공된 노트 몇 개, 정상/멈춤 의심이 한눈에 보인다. 같은 내용이 `data/status.json` 에도 있다.
- **멈춤 감시**: 최신 뉴스 날짜가 이틀보다 더 오래됐거나 뉴스가 하나도 없으면 "멈춤 의심"으로 표시한다.
- **알림**: 멈춤이면 저장소에 "자동화 멈춤 알림" 이슈가 열리고(깃허브가 이메일·앱으로 알려줌), 정상으로 돌아오면 자동으로 닫힌다. 저장소 시크릿 `DISCORD_WEBHOOK_URL` 을 넣으면 디스코드로도 온다.
- **옵시디언**: `data/obsidian/지식센터/` 에 뉴스·스크립트·노트가 복사되고 `지식센터 홈.md` 가 목록을 잡아 준다. PC에서는 `pc/옵시디언_자동받기.ps1` 을 한 번 실행해 두면 볼트 폴더가 매일 최신이 된다(`-Register` 를 붙이면 매일 07:30 자동 실행 등록).
- **노션**: 시크릿 `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID` 를 넣으면 새 노트·뉴스가 노션 페이지로 올라간다. 없으면 그냥 건너뛴다.
- 직접 돌려보기: `python automation/scripts/dashboard.py` → `python automation/scripts/notify.py --dry-run`. 멈춤 상태 시험은 `dashboard.py --today 2026-12-31`.
