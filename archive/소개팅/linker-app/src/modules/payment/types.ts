// PaymentProvider 인터페이스 — 실제 PG/계좌이체 연동 시 이 인터페이스만 구현해서 교체.
export type DepositKind = "initial" | "final";

export interface DepositRequestInput {
  userId: number;
  kind: DepositKind;
  amount: number;
  memo?: string;
}

export interface DepositRequestResult {
  requestId: number;
  status: "pending" | "confirmed" | "rejected";
}

export interface PaymentProvider {
  /** 사용자가 입금했다고 신고(신청)하는 단계 */
  requestDeposit(input: DepositRequestInput): Promise<DepositRequestResult>;
  /** 관리자가 실제 입금 확인 후 승인 */
  confirmDeposit(requestId: number): Promise<void>;
  /** 관리자가 반려 */
  rejectDeposit(requestId: number, reason?: string): Promise<void>;
}
