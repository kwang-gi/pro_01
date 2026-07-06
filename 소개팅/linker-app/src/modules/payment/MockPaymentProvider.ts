// [모의] 입금 신고 → 관리자 확인 방식. 실제 계좌이체/PG 웹훅 없이 DB 상태만으로 흉내낸다.
import { getDb } from "@/lib/db";
import type {
  DepositRequestInput,
  DepositRequestResult,
  PaymentProvider,
} from "./types";

export class MockPaymentProvider implements PaymentProvider {
  async requestDeposit(input: DepositRequestInput): Promise<DepositRequestResult> {
    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO deposit_requests (user_id, kind, amount, memo, status) VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(input.userId, input.kind, input.amount, input.memo ?? "[모의] 입금 신고");
    return { requestId: info.lastInsertRowid as number, status: "pending" };
  }

  async confirmDeposit(requestId: number): Promise<void> {
    const db = getDb();
    const req = db
      .prepare(`SELECT * FROM deposit_requests WHERE id = ?`)
      .get(requestId) as
      | { id: number; user_id: number; kind: string; amount: number; status: string }
      | undefined;
    if (!req) throw new Error("입금 신고 내역을 찾을 수 없습니다.");
    if (req.status !== "pending") throw new Error("이미 처리된 요청입니다.");

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE deposit_requests SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?`
      ).run(requestId);

      // 계좌 없으면 생성
      db.prepare(
        `INSERT OR IGNORE INTO ledger_accounts (user_id, deposit_balance, fee_balance) VALUES (?, 0, 0)`
      ).run(req.user_id);

      if (req.kind === "initial") {
        // 예치금5 + 주선비1
        db.prepare(
          `UPDATE ledger_accounts SET deposit_balance = deposit_balance + 5, fee_balance = fee_balance + 1, updated_at = datetime('now') WHERE user_id = ?`
        ).run(req.user_id);
      } else {
        // 잔금 (final, 보통 5) — 예치금 계좌에 가산
        db.prepare(
          `UPDATE ledger_accounts SET deposit_balance = deposit_balance + ?, updated_at = datetime('now') WHERE user_id = ?`
        ).run(req.amount, req.user_id);
      }
    });
    tx();
  }

  async rejectDeposit(requestId: number): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE deposit_requests SET status = 'rejected' WHERE id = ?`).run(requestId);
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
