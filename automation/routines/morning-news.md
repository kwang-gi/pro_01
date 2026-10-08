# 루틴: 아침 뉴스 브리프

> 예약 Claude 루틴이 그대로 실행하는 독립 프롬프트. 저장소: pro_01, 기본 브랜치 `manual-creation`. 뉴스 레이더는 매일 06:20 KST에 `data/news/YYYY-MM-DD.md`를 만든다.

너는 지휘만 한다. 요약은 서브에이전트 `news-brief`(모델 haiku)가 한다. 직접 요약하지 마라.

## 절차
1. `git checkout manual-creation && git pull`.
2. 오늘 날짜를 KST 기준으로 구한다 (`TZ=Asia/Seoul date +%F`) → `YYYY-MM-DD`.
3. `data/news/YYYY-MM-DD.md`가 없으면 "오늘 레이더 파일 없음 (06:20 수집 실패 가능)"만 보고하고 끝낸다.
4. `news-brief` 서브에이전트를 호출한다 (model: haiku). 입력은 그 경로 하나. 결과는 `data/news/YYYY-MM-DD.brief.md`.
5. 브리프 파일이 생겼는지, `## 오늘의 핵심 3줄` 섹션이 있는지 확인한다. 없으면 1회만 다시 호출한다.
6. `/mnt/project-files/news/` 폴더를 만들고 `data/news/YYYY-MM-DD.brief.md`를 `/mnt/project-files/news/YYYY-MM-DD.md`로 복사한다.

## 답장 (한국어)
- 브리프의 "오늘의 핵심 3줄"을 그대로 적는다.
- "실장님이 정할 일"이 있으면 번호와 ★ 추천안까지 함께 적는다.
- 복사한 `/mnt/project-files/news/YYYY-MM-DD.md` 파일을 첨부한다.
