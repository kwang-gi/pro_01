# linker-app 실사 보고서 (2026-07-06)

> 대상: `C:\cc\test\0706_소개팅_초안_페이블\linker-app\` 전체 정독 (node_modules, .next 제외)
> 방법: 코드 읽기만 수행. 빌드/npm 실행 없음. `data/` 폴더 없음 → DB는 아직 한 번도 실행되지 않은 상태(seed 미적용).
> 모든 항목에 파일경로 근거 명시. 근거 없는 내용은 "확인 불가"로 표시.

---

## 1. 화면 라우트 전체 목록 (`src/app` 기준)

| 경로 | 파일 | 한 줄 설명 |
|---|---|---|
| `/` | `src/app/page.tsx` | 랜딩 페이지. 서비스 소개 + 회원가입/로그인 버튼 |
| `/login` | `src/app/login/page.tsx` | 로그인 폼 (아이디/비밀번호) + 시드 계정 안내 박스 |
| `/signup` | `src/app/signup/page.tsx` | 회원가입 폼. 역할(남/여 신청자, 주선자) 선택형 |
| `/dashboard` | `src/app/dashboard/page.tsx` | 신청자용: 잔고 표시, 최초 입금 신고 버튼, 받은 제안 목록(수락/거절), 경고팝업 확인 |
| `/meetings/[id]` | `src/app/meetings/[id]/page.tsx` | 제안(만남) 상세: 경고팝업 → 만남 1~3회 기록 → 신고하기 모달 |
| `/notices` | `src/app/notices/page.tsx` | 전체 공지 게시판 (로그인 불필요) |
| `/admin` | `src/app/admin/page.tsx` | 관리자 콘솔: 유저/입금/신고/공지/주선자성사율/정산 6개 탭 |
| `/broker/acquaintances` | `src/app/broker/acquaintances/page.tsx` | 주선자: 지인 등록 폼 + 목록 + 동의 처리[모의] 버튼 |
| `/broker/propose` | `src/app/broker/propose/page.tsx` | 주선자: 동의된 지인 선택 → 신청자 선택 → 제안 발송 |
| `/broker/settlement` | `src/app/broker/settlement/page.tsx` | 주선자: 본인 정산(성사비 분배) 현황 목록 |
| (공통 레이아웃) | `src/app/layout.tsx` | 전체 레이아웃, NavBar/Footer 포함 |

총 **10개 사용자 화면 라우트** (레이아웃 제외). PRD의 "요청형 소개 게시판"(신청자→주선자) 화면은 존재하지 않음 — 근거: `src/app` 전체 디렉토리 목록에 해당 경로 없음.

---

## 2. API 라우트 전체 목록 (`src/app/api` 기준)

| 경로 | 메서드 | 파일 | 역할 |
|---|---|---|---|
| `/api/auth/signup` | POST | `src/app/api/auth/signup/route.ts` | 회원가입, 역할별 인증 Provider 선택(`pickVerificationProvider`), ledger 계좌 생성 |
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` | 로그인, 평문 비밀번호 비교(`user.password !== body.password`), 세션 쿠키 발급 |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | 세션 삭제 + 쿠키 제거 |
| `/api/me` | GET | `src/app/api/me/route.ts` | 현재 로그인 유저 + ledger 잔고 조회 |
| `/api/acquaintances` | GET/POST | `src/app/api/acquaintances/route.ts` | GET: 주선자 본인 지인 목록. POST: 지인 등록(성비룰 검증) + 동의알림 발송[모의] |
| `/api/acquaintances/[id]/consent` | PATCH | `src/app/api/acquaintances/[id]/consent/route.ts` | 지인 동의/거절 처리(주선자 대리 입력) |
| `/api/applicants` | GET | `src/app/api/applicants/route.ts` | 주선자가 제안 보낼 활성 신청자 목록(성별 쿼리 필터) |
| `/api/proposals` | GET/POST | `src/app/api/proposals/route.ts` | GET: 역할별 관련 제안 목록. POST: 주선자가 제안 생성 |
| `/api/proposals/[id]` | GET | `src/app/api/proposals/[id]/route.ts` | 제안 상세 + 만남 이력 조회 (본인/주선자/관리자만) |
| `/api/proposals/[id]/accept` | POST | `src/app/api/proposals/[id]/accept/route.ts` | 신청자가 제안 수락(주선비1 차감) |
| `/api/proposals/[id]/decline` | POST | `src/app/api/proposals/[id]/decline/route.ts` | 신청자가 제안 거절 |
| `/api/proposals/[id]/ack-warning` | POST | `src/app/api/proposals/[id]/ack-warning/route.ts` | 금지조항 경고 팝업 확인 처리 |
| `/api/meetings` | POST | `src/app/api/meetings/route.ts` | 만남 회차 기록. 3회 도달 시 정산 생성 + 잔금 입금신고 자동 생성[모의] |
| `/api/reports` | POST | `src/app/api/reports/route.ts` | 4대 조항 신고 접수 |
| `/api/notices` | GET | `src/app/api/notices/route.ts` | 전체 공지 조회(로그인 불필요) |
| `/api/payments/deposit-request` | GET/POST | `src/app/api/payments/deposit-request/route.ts` | GET: 내 입금신고 내역. POST: 최초 입금(5+1=6) 신고 |
| `/api/settlements` | GET | `src/app/api/settlements/route.ts` | 주선자 본인 정산 현황 |
| `/api/admin/users` | GET | `src/app/api/admin/users/route.ts` | 관리자: 전체 유저+잔고 목록 |
| `/api/admin/users/[id]/approve` | POST | `src/app/api/admin/users/[id]/approve/route.ts` | 등기인증 승인(가입 승인) |
| `/api/admin/users/[id]/reject` | POST | `src/app/api/admin/users/[id]/reject/route.ts` | 등기인증 반려 |
| `/api/admin/payments` | GET | `src/app/api/admin/payments/route.ts` | 관리자: 전체 입금신고 목록 |
| `/api/admin/payments/[id]/confirm` | POST | `src/app/api/admin/payments/[id]/confirm/route.ts` | 입금 확인 → 잔고 반영 |
| `/api/admin/payments/[id]/reject` | POST | `src/app/api/admin/payments/[id]/reject/route.ts` | 입금 신고 반려 |
| `/api/admin/reports` | GET | `src/app/api/admin/reports/route.ts` | 관리자: 전체 신고 목록 |
| `/api/admin/reports/[id]/confirm` | POST | `src/app/api/admin/reports/[id]/confirm/route.ts` | 신고 확정 → 몰수+연대몰수+공지+환불 일괄 처리 |
| `/api/admin/reports/[id]/dismiss` | POST | `src/app/api/admin/reports/[id]/dismiss/route.ts` | 신고 기각 |
| `/api/admin/notices` | POST | `src/app/api/admin/notices/route.ts` | 관리자 공지 작성 |
| `/api/admin/brokers` | GET | `src/app/api/admin/brokers/route.ts` | 관리자: 주선자별 성사율 목록 |
| `/api/admin/settlements` | GET | `src/app/api/admin/settlements/route.ts` | 관리자: 전체 정산 목록 |
| `/api/admin/settlements/[id]/pay` | POST | `src/app/api/admin/settlements/[id]/pay/route.ts` | 정산 지급 완료 처리 |

총 **29개 API 라우트**. PRD의 "요청형 소개" API(신청자가 요청 게시 → 주선자 응답), "버전 체크 API", "settings 관리자 API", "클라이언트별 개별 설정" API는 전부 없음 — 근거: `src/app/api` 하위에 `requests`, `version`, `settings` 관련 디렉토리가 존재하지 않음(1절 파일 목록 참조).

---

## 3. `src/modules/` 모듈별 구조

| 모듈 | 파일 | 역할 | 실제/모의 구분 |
|---|---|---|---|
| `matching/` | `rules.ts`, `service.ts`, `types.ts`, `index.ts` | 지인등록, 제안생성/수락/거절, 만남기록, 3회 성사판정, 성비룰, 월3회 쿨타임, 성사율 계산 | **핵심 도메인 로직 — 모의 아님.** 근거: `src/modules/matching/README.md` 1행 "핵심 도메인, 모의 아님" |
| `payment/` | `MockPaymentProvider.ts`, `TossProvider.stub.ts`, `types.ts`, `index.ts` | 입금 신고→관리자 확인 흐름으로 잔고 갱신 | **[모의].** `index.ts`가 `MockPaymentProvider`를 export(`src/modules/payment/index.ts:2`). `TossProvider.stub.ts`는 3개 메서드 모두 `throw new Error("TossProvider 미구현...")`로 완전 미구현 스텁 (`src/modules/payment/TossProvider.stub.ts:6-14`) |
| `verification/` | `MockSmsVerification.ts`, `MockRegisteredMail.ts`, `types.ts`, `index.ts` | 여성=문자인증(즉시 active), 남성/주선자=등기인증(관리자 승인 대기) | **[모의].** SMS는 실제 발송 없이 즉시 `active` 처리(`src/modules/verification/MockSmsVerification.ts:11`), 등기는 관리자가 `/admin`에서 버튼 클릭해야 활성화(`src/modules/verification/MockRegisteredMail.ts:11-24`). 실서비스 Provider 없음(스텁조차 없음) |
| `notify/` | `MockAlimtalk.ts`, `types.ts`, `index.ts` | 지인 동의 요청/응답 처리 | **[모의].** 실제 알림톡 발송 없이 `console.log`만 남기고 DB 상태 변경(`src/modules/notify/MockAlimtalk.ts:13`). 실 Provider·스텁 파일 없음 |
| `settlement/` | `service.ts`, `index.ts` | 성사비 원장 기록, 주선자 분배, 몰수, 환불(즉시/대기 분기), 정산 지급 | **실제 로직(로컬 DB 원장)** — 외부 회계 시스템 연동 없음(README상 "교체 가이드"는 존재하나 현재는 순수 SQLite 구현). 근거: `src/modules/settlement/README.md` |
| `report/` | `service.ts`, `index.ts` | 4대 조항(폭력/포교/사업/돈) 신고 접수, 확정 시 몰수+공지+환불 트랜잭션 처리 | **실제 로직, 외부 연동 없음.** 근거: `src/modules/report/README.md` "외부 연동 없는 순수 도메인 로직" |
| `notice/` | `service.ts`, `index.ts` | 공지 CRUD (수동 작성 + 신고확정 시 자동생성) | **실제 로직, 외부 연동 없음** |

★ 요약: **payment / verification / notify = 전부 [모의]**. **matching / settlement / report / notice = 실제 로직**(단, settlement은 로컬 SQLite 원장이라 실제 회계 시스템은 아님).

---

## 4. DB 스키마

정의 파일: `src/lib/db.ts` (`initSchema` 함수, 37~145행)

| 테이블 | 주요 칼럼 | 비고 |
|---|---|---|
| `users` | id, username, password(평문!), role(male_applicant/female_applicant/broker/admin), display_name, gender, birth_year, region, job, verification_status(pending/active/rejected), verification_method(sms/registered_mail), created_at | `src/lib/db.ts:38-52` |
| `ledger_accounts` | user_id(PK), deposit_balance(예치금5), fee_balance(주선비1), updated_at | `src/lib/db.ts:54-59` |
| `deposit_requests` | id, user_id, kind(initial/final), amount, status(pending/confirmed/rejected), memo, created_at, confirmed_at | `src/lib/db.ts:61-70`. `kind='refund_wait'`도 실제로 사용됨(스키마 CHECK 제약 없음) — 근거: `src/modules/settlement/service.ts:69` |
| `acquaintances` | id, broker_id, gender, birth_year, region, job, intro, consent_status(pending/agreed/declined), created_at | `src/lib/db.ts:72-83` |
| `proposals` | id, broker_id, acquaintance_id, applicant_id, status(proposed/accepted/declined/in_progress/matched/ended), meeting_count, warning_ack, created_at, accepted_at, matched_at | `src/lib/db.ts:85-96` |
| `meetings` | id, proposal_id, seq(1~3), applicant_confirmed, acquaintance_confirmed, note, created_at | `src/lib/db.ts:98-106` |
| `settlements` | id, proposal_id, broker_id, total_fee(기본10), broker_rate(기본0.5), broker_amount, status(pending/paid), created_at, paid_at | `src/lib/db.ts:108-118` |
| `reports` | id, reporter_id, accused_id, proposal_id, category(violence/proselytize/business/money), content, status(pending/confirmed/dismissed), created_at, resolved_at | `src/lib/db.ts:120-130` |
| `notices` | id, title, content, is_auto, created_at | `src/lib/db.ts:132-138` |
| `sessions` | token(PK), user_id, created_at | `src/lib/db.ts:140-144` |

**총 10개 테이블.** PRD가 요구하는 `settings` 테이블(관리자 정책값 저장용)은 **존재하지 않음** — 근거: `initSchema` 함수 전체(37~145행)에 `settings` 테이블 CREATE 구문 없음.

---

## 5. ★ 정책값 하드코딩 위치 전부 (관리자 settings 이전 대상)

| 정책값 | 현재 값 | 파일:줄 | 비고 |
|---|---|---|---|
| 예치금 | 5 | `src/modules/matching/rules.ts:6` (`INITIAL_DEPOSIT = 5`) | |
| 최초 주선비 선납 | 1 | `src/modules/matching/rules.ts:7` (`INITIAL_BROKER_FEE = 1`) | |
| 성사 시 잔금 | 5 | `src/modules/matching/rules.ts:8` (`FINAL_PAYMENT = 5`) | |
| 총 성사비(원장 고정값) | 10 | `src/modules/matching/rules.ts:11` (`TOTAL_SUCCESS_FEE = 10`) | 최초주선비1+잔금5=6과 별개 개념이라고 주석에 명시(9~10행) |
| 주선자 분배 비율 | 0.5(50%) | `src/modules/matching/rules.ts:12` (`DEFAULT_BROKER_RATE = 0.5`) | PRD는 7:3 또는 8:2 요구 — 현재값과 상이 |
| 성사 기준 만남 횟수 | 3회 고정 | `src/modules/matching/rules.ts:4` (`MEETING_TO_MATCH = 3`) | PRD는 3/5/7/여행 선택형 요구 — 현재 고정값만 |
| 동일 지인 월 소개 한도(쿨타임) | 3회 | `src/modules/matching/rules.ts:5` (`MONTHLY_COOLTIME_LIMIT = 3`) | |
| DB 테이블 기본값: settlements.total_fee | 10 | `src/lib/db.ts:112` (`DEFAULT 10`) | rules.ts 값과 중복 하드코딩(이원화 위험) |
| DB 테이블 기본값: settlements.broker_rate | 0.5 | `src/lib/db.ts:113` (`DEFAULT 0.5`) | 위와 동일 이원화 위험 |
| 신고 확정 시 피해자 환불 예치금 재설정값 | 5(고정) | `src/modules/settlement/service.ts:82` (`deposit_balance = 5`) | "원래 값 유지"라는 주석이 있으나 실제로는 5로 하드코딩 재설정 — 예치금 정책 바뀌면 함께 수정 필요 |
| 성사비 분배 계산식 | `TOTAL_SUCCESS_FEE * brokerRate` | `src/modules/settlement/service.ts:12` | 함수 인자로 `brokerRate` override 가능은 하나 실제 호출부(`src/app/api/meetings/route.ts:38`)는 override 없이 기본값만 사용 |
| 남자 주선자 성비 룰(여자 지인만 등록 가능) | 하드코딩 로직 | `src/modules/matching/rules.ts:15-21` (`canRegisterAcquaintance`) | on/off 스위치 없음, 함수 자체가 규칙 |
| 신고 4대 조항 카테고리 목록 | 코드에 고정 | `src/modules/report/service.ts:5, 7-12` / `src/app/api/reports/route.ts:5` / `src/app/meetings/[id]/page.tsx:184-190` (프론트 select 옵션) | 3곳에 라벨 중복 정의(`report/service.ts`, `admin/page.tsx:72-77`도 별도 `CATEGORY_LABEL` 보유) |
| 경고 문구(금지조항 텍스트) | 하드코딩 | `src/modules/matching/rules.ts:39-50` **및** `src/components/WarningModal.tsx:4-9` (텍스트 중복 정의, 서버/클라 이원화) | |
| 여성 우대요금/동일요금 모드 | **미구현** | 해당 없음 | PRD 항목3 — 코드에 분기 자체가 없음 |
| 예치금 모드 A(선입금)/B(입금확인후연결) 스위치 | **미구현, A모드만 존재** | 해당 없음 | PRD 항목2 — 코드 전체가 "선입금" 모드 하나만 구현 |
| 우수 주선자 추가 우대(+5%) | **미구현** | 해당 없음 | PRD 항목4 후반부 |
| 개인정보 분리 저장 | **미구현** | `src/lib/db.ts` — `users` 테이블에 개인정보(이름/성별/출생연도/지역/직업) 전부 메인 DB에 통합 저장 | PRD 항목5 위반 상태 |

---

## 6. 시드 계정 및 실행법 (README.md 기준 요약)

근거: `C:\cc\test\0706_소개팅_초안_페이블\linker-app\README.md` 7~29행

**실행법**
```bash
npm install
npm run dev
```
브라우저 `http://localhost:3000` 접속. 최초 실행 시 `data/linker.db` 자동 생성 + 시드 주입(파일 있으면 재시드 안 함, 초기화하려면 `data/` 삭제 후 재실행). 빌드는 `npm run build`, 배포 실행은 `npm run start`.

**시드 계정** (실제 삽입 로직 근거: `src/lib/seed.ts:16-101`)

| 역할 | 아이디 | 비밀번호 | 상태 |
|---|---|---|---|
| 관리자 | admin | admin123 | active |
| 주선자(남) | broker_m | 1234 | active, 여자 지인만 등록 가능 |
| 주선자(여) | broker_f | 1234 | active, 남녀 지인 모두 등록 가능 |
| 신청자(남1) | male1 | 1234 | active, 진행중 소개 1건(만남 1회 완료 상태) 보유 |
| 신청자(남2) | male2 | 1234 | pending(등기인증 승인 대기) |
| 신청자(여1) | female1 | 1234 | active |
| 신청자(여2) | female2 | 1234 | active |

참고: 현재 프로젝트 폴더에 `data/` 디렉토리가 없음(확인: `ls` 결과 없음) → 이 실사 시점 기준 **DB가 한 번도 생성/시드된 적이 없는 상태**.

---

## 7. PRD v2 구현항목 1~10 대비 현황표

근거 문서: `C:\cc\test\0706_소개팅_초안_페이블\_작업\0706_PRD_MVP_v2.md` (31~42행 "이에 따른 구현 항목")

| # | PRD 구현 항목 | 상태 | 근거 |
|---|---|---|---|
| 1 | `settings` 테이블 + 관리자 설정 탭 (정책값 즉시반영) | **없음** | `src/lib/db.ts` 전체에 `settings` 테이블 CREATE 없음. `src/app/admin/page.tsx` 6개 탭(users/payments/reports/notices/brokers/settlements) 중 "설정" 탭 없음(`src/app/admin/page.tsx:5, 63-70`) |
| 2 | 주선비 2종 원장 반영 (기본 주선비/성공 사례비 분리) | **없음** | `settlements` 테이블은 `total_fee` 단일 칼럼만 보유(`src/lib/db.ts:108-118`). `rules.ts`도 `INITIAL_BROKER_FEE`(1)와 `TOTAL_SUCCESS_FEE`(10) 두 상수는 있으나 이는 PRD가 말하는 "기본주선비 7~10만원 / 성공사례비 50~80만원"의 별도 원장 구조가 아니라 데모용 단위(1/5/10) 그대로임 — 근거: `src/modules/matching/rules.ts:6-12` |
| 3 | 예치금 모드 A/B 스위치 | **없음** | `payment` 모듈은 "입금신고→관리자확인" 단일 흐름만 존재(`src/modules/payment/MockPaymentProvider.ts`). 모드 선택 로직·설정값 없음 |
| 4 | 요청형 소개 게시판 (신청자→주선자) | **없음** | `src/app` 라우트 목록(1절)에 요청 게시판 경로 없음. `matching` 모듈은 제안형(`createProposal`, 주선자→신청자)만 구현(`src/modules/matching/service.ts:35-76`) |
| 5 | 우수 주선자 우대(+5%) 로직 | **없음** | `createSettlementOnMatch`는 `DEFAULT_BROKER_RATE`(0.5) 고정 사용, 우대 가산 로직 없음(`src/modules/settlement/service.ts:5-17`) |
| 6 | 성사 기준 모드 스위치(고정/선택형) | **없음(고정 3회만)** | `MEETING_TO_MATCH = 3` 상수 하나만 존재, 신청자가 3/5/7/여행 등을 선택하는 UI·로직 없음(`src/modules/matching/rules.ts:4`) |
| 7 | 지인·상대 화면 수수료 정보 숨김 처리 검수 | **부분(설계상 지킴, 별도 검수 로직 없음)** | 현재 화면들(`dashboard/page.tsx`, `meetings/[id]/page.tsx`, `broker/acquaintances/page.tsx`)에 수수료 관련 텍스트 자체가 출력되지 않아 결과적으로 노출은 안 되고 있으나, 이는 "검수 체계"가 있어서가 아니라 애초에 그 정보를 보여줄 화면이 없기 때문. 명시적 검수 로직·테스트 없음 |
| 8 | 버전 체크 API + 로그인 시 자동 업데이트 안내 | **없음** | `/api` 목록(2절)에 버전 관련 라우트 없음. `src/app/api/auth/login/route.ts` 응답에도 버전 정보 없음(1~28행) |
| 9 | 클라이언트별 개별 설정 오버라이드 | **없음** | `settings` 테이블 자체가 없으므로 오버라이드 개념도 없음 |
| 10 | 개인정보 분리 저장 구조 | **없음** | `users` 테이블 하나에 인증정보(username/password)와 개인정보(display_name/gender/birth_year/region/job)가 모두 통합(`src/lib/db.ts:38-52`). 별도 테이블/파일 분리 없음 |

**요약: PRD v2 구현항목 10개 중 9개가 "없음", 1개("수수료 숨김")가 "부분"(결과적으로는 안 보이나 의도된 검수 체계는 아님).** 현재 코드베이스는 v1 수준의 데모 MVP(단일 정책값 하드코딩 + 제안형 소개만 구현)이며, v2에서 확정된 "관리자 설정으로 정책 전환" 방향은 아직 착수 전 상태.

---

## 부록: 알려진 제한사항 (README.md 원문, 77~82행)

- 비밀번호 평문 저장(데모 편의, 실서비스 전환 전 해시 필요) — 근거: `src/lib/db.ts:41`, `src/app/api/auth/login/route.ts:15`
- 주선자 전용 "예치금" 계좌 개념 없음 → 신고 연대 몰수 시 주선자 몰수액 0 처리될 수 있음 — 근거: `src/modules/settlement/service.ts:37-49`(ledger_accounts가 없으면 amount=0 반환)
- 알림/문자/등기/PG 전부 [모의] — 실제 발송/결제 없음 (3절 표 참조)
- 신고 대상(`accused_id`) 선택 UI가 "이 제안의 신청자"로 단순화 — 지인 본인을 특정할 계정이 없는 구조적 한계 — 근거: `src/app/meetings/[id]/page.tsx:92`(`accused_id: proposal.applicant_id` 고정)
