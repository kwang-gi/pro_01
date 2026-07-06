# payment 모듈

예치금(5) + 주선비(1) 최초 입금, 성사 후 잔금(5) 입금을 처리하는 블럭입니다.
현재는 `MockPaymentProvider`가 "사용자가 입금했다고 신고 → 관리자가 화면에서 확인 버튼 클릭"으로
실제 PG 없이 잔고(ledger_accounts)를 갱신합니다.

## 진짜 블럭으로 교체하는 법
1. `TossProvider.stub.ts`에 실제 PG(Toss Payments 등) 연동 로직을 구현 (webhook 수신, 입금 확인 API 등)
2. `index.ts`의 `export { paymentProvider } from "./MockPaymentProvider"` 를
   `export { tossProvider as paymentProvider } from "./TossProvider.stub"` 로 교체
3. 나머지 코드(`app/api/**`)는 `paymentProvider` 인터페이스만 사용하므로 수정 불필요
