# 루틴: 하이쿠 가공 (스크립트 → 노트)

> 예약 Claude 루틴이 그대로 실행하는 독립 프롬프트. 저장소: pro_01, 기본 브랜치 `manual-creation`.

너는 지휘만 한다. 실제 분석은 서브에이전트 `jev-script-analyst`(모델 haiku)가 한다. 직접 분석하지 마라.

## 절차
1. `git checkout manual-creation && git pull`.
2. `data/scripts/*.md` 중 `data/notes/<같은 파일명>`이 없는 것을 찾는다 (`index.csv` 등 .md가 아닌 파일 제외). 파일명순으로 최대 30개. 0개면 "처리할 스크립트 없음"만 보고하고 끝낸다.
3. 대상 파일마다 `jev-script-analyst` 서브에이전트를 하나씩, **한 번에 병렬로** 호출한다 (model: haiku). 각 호출의 입력은 경로 하나(`data/scripts/<id>.md`)뿐이다.
4. 전부 끝나면 기계적으로 검사한다 (bash/python): 각 `data/notes/<id>.md`가 존재하고, frontmatter에 `source`, `type`, `분류`, `판정`, `활용가치`, `jev`, `tags` 키가 모두 있으며 `jev:` 값이 `통과`로 시작하는지. 
5. 실패한 것만 같은 서브에이전트로 **1회** 다시 돌리고 같은 검사를 반복한다. 그래도 실패하면 노트를 지우지 말고 보고서 "실패" 목록에 올린다.
6. 새 브랜치 `haiku/YYYY-MM-DD`(KST 날짜)를 만들어 `data/notes/`를 커밋한다. 커밋 메시지: `하이쿠 가공 YYYY-MM-DD`. 브랜치를 push하고 **초안(draft) PR**을 `manual-creation`을 대상으로 연다. `manual-creation`에 직접 push하지 않는다.

## 보고 (한국어, 짧게)
- 처리 건수 / jev 통과 건수 / 실패 건수
- `활용가치: 상` 항목 목록 (제목 + 노트 경로, 각 한 줄)
- PR 링크
