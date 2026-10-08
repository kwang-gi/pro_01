# automation — 지시 없이 도는 무료 자동화

| 구성 | 파일 | 언제 | 비용 |
|---|---|---|---|
| 뉴스 레이더 | `scripts/news_radar.py` + `config/news_sources.json` | 매일 06:20 KST (GitHub Actions) | 0원 (모델 안 씀) |
| 영상 스크립트 수집 | `scripts/yt_scripts.py` + `config/yt_targets.json` | 월·목 06:35 KST | 0원 (모델 안 씀) |
| 하이쿠 가공 | `scripts/haiku_fanout.py` + `jev/스크립트분석_기준서.md` | 수집 직후, API 키 있을 때만 | 영상 1개 약 $0.0005~0.001 (캐싱) |

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
