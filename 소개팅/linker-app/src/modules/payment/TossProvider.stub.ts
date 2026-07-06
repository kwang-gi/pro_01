// 진짜 블럭 자리 — Toss Payments(또는 유사 PG) 연동 시 이 파일을 완성해서
// src/modules/payment/index.ts 의 export를 MockPaymentProvider -> TossProvider 로 교체하면 끝.
import type { PaymentProvider } from "./types";

export class TossProvider implements PaymentProvider {
  requestDeposit(): ReturnType<PaymentProvider["requestDeposit"]> {
    throw new Error("TossProvider 미구현 — 실제 PG 연동 시 구현하세요.");
  }
  confirmDeposit(): ReturnType<PaymentProvider["confirmDeposit"]> {
    throw new Error("TossProvider 미구현");
  }
  rejectDeposit(): ReturnType<PaymentProvider["rejectDeposit"]> {
    throw new Error("TossProvider 미구현");
  }
}
