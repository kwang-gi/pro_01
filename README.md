# pro_01 — 지식센터 학습 및 업무 자동화

실장님 "지식센터학습및업무자동화" 프로젝트의 코드 저장소입니다. 흩어진 작업을 모아 Claude가 총괄하고, 무료 파이썬 스크립트와 예약 실행으로 지시 없이 돌아가게 하는 것이 목적입니다.

## 구조
| 폴더 | 내용 |
|---|---|
| `automation/` | 자동화 스크립트·설정·jev 기준서 (사용법은 `automation/README.md`) |
| `.github/workflows/automation.yml` | GitHub Actions 예약 실행 (뉴스 매일 06:20 KST, 영상 스크립트 월·목 06:35 KST) |
| `data/` | 자동 수집·가공 결과 (뉴스, 스크립트, 노트). 옵시디언 frontmatter 포함 |
| `archive/` | 이 프로젝트 이전의 자료 (2026-10-08 이동, 내용 수정 없음) |

## 운영 원칙 (프로젝트 지침 요약)
- 효율과 자동화 최우선. 모델 호출은 꼭 필요한 판단에만 쓴다.
- 모델 분업: 기획·판단 Opus 5.5 / 구현·분석 Sonnet 5.5 / 반복·대량 Haiku 5.5 + 프롬프트 캐싱 / 필요 시 로컬 1~3B.
- 구조: 트리거 → 검증된 파이썬 스크립트 1개 → 보고 (노드를 늘리지 않는다).
- 하이쿠 작업자는 jev 기준서(목표점·출력 규격·채점표·예외·중단·완료 조건)를 받아 단발로 실행한다. 한 호출이 10만 토큰을 넘지 않게 한다.
- 만든 자동화는 한 번 실제로 돌려 검증하고 결과를 문서에 남긴다.

## archive/ 에 옮긴 것
| 경로 | 내용 | 원래 안내 문서 |
|---|---|---|
| `archive/소개팅/` | 지인 소개 매칭 MVP(`linker-app`, Next.js + SQLite, 외부 연동은 모의) + PRD v1~v3·검증계획·시장조사 문서 + 설명서 | `archive/소개팅/linker-app/README.md`, `CLAUDE.md`(AGENTS.md: Next.js 새 버전 주의) |
| `archive/클로드_3d/` | 3D 비행 시뮬레이터(Three.js, 2025-08 완료) 계획서·진행사항·완료 보고서 | `archive/클로드_3d/프로젝트_완료_보고서.md` |
| `archive/250526.manual.md` | 빈 사용 설명서 템플릿 | — |

linker-app은 폴더째 옮겨서 자체 README·CLAUDE.md가 그대로 유효합니다. 실행하려면 `archive/소개팅/linker-app` 에서 `npm install && npm run dev`.
