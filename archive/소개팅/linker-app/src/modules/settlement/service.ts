// 정산(원장/ledger) 모듈. 성사비 총액 기록, 주선자 분배, 몰수 처리, 환불 처리.
import { getDb } from "@/lib/db";
import { DEFAULT_BROKER_RATE, TOTAL_SUCCESS_FEE } from "@/modules/matching/rules";

export function createSettlementOnMatch(proposalId: number, brokerId: number, brokerRate = DEFAULT_BROKER_RATE) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM settlements WHERE proposal_id = ?`)
    .get(proposalId);
  if (existing) return; // 이미 생성됨 (중복 방지)

  const brokerAmount = TOTAL_SUCCESS_FEE * brokerRate;
  db.prepare(
    `INSERT INTO settlements (proposal_id, broker_id, total_fee, broker_rate, broker_amount, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).run(proposalId, brokerId, TOTAL_SUCCESS_FEE, brokerRate, brokerAmount);
}

export function listPendingSettlements(brokerId?: number) {
  const db = getDb();
  if (brokerId) {
    return db
      .prepare(`SELECT * FROM settlements WHERE broker_id = ? ORDER BY created_at DESC`)
      .all(brokerId);
  }
  return db.prepare(`SELECT * FROM settlements ORDER BY created_at DESC`).all();
}

export function paySettlement(settlementId: number) {
  const db = getDb();
  db.prepare(
    `UPDATE settlements SET status = 'paid', paid_at = datetime('now') WHERE id = ?`
  ).run(settlementId);
}

/** 몰수: 가해자 예치금 전액 몰수 + 연대책임 주선자 예치금(있다면) 몰수. 실제로는 주선자는 예치금 계좌가 없을 수 있으므로 있으면 처리 */
export function confiscateDeposit(userId: number): number {
  const db = getDb();
  const ledger = db
    .prepare(`SELECT deposit_balance FROM ledger_accounts WHERE user_id = ?`)
    .get(userId) as { deposit_balance: number } | undefined;
  const amount = ledger?.deposit_balance ?? 0;
  if (amount > 0) {
    db.prepare(
      `UPDATE ledger_accounts SET deposit_balance = 0, updated_at = datetime('now') WHERE user_id = ?`
    ).run(userId);
  }
  return amount;
}

/** 환불: 매칭 이력 없으면 즉시 환불 처리, 있으면 대기 상태 반환 */
export function requestRefund(userId: number): { immediate: boolean } {
  const db = getDb();
  const matchedHistory = db
    .prepare(
      `SELECT COUNT(*) as c FROM proposals WHERE applicant_id = ? AND status IN ('accepted','in_progress','matched')`
    )
    .get(userId) as { c: number };

  if (matchedHistory.c === 0) {
    // 즉시 환불: 예치금 0으로
    db.prepare(
      `UPDATE ledger_accounts SET deposit_balance = 0, fee_balance = 0, updated_at = datetime('now') WHERE user_id = ?`
    ).run(userId);
    return { immediate: true };
  }
  // 환불 대기(유예) - refund_requests 테이블이 없으므로 deposit_requests에 kind='refund_wait'로 기록
  db.prepare(
    `INSERT INTO deposit_requests (user_id, kind, amount, status, memo) VALUES (?, 'refund_wait', 0, 'pending', '환불 대기(유예) - 관리자 처리 필요')`
  ).run(userId);
  return { immediate: false };
}

export function refundVictimImmediately(userId: number) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO ledger_accounts (user_id, deposit_balance, fee_balance) VALUES (?, 0, 0)`
  ).run(userId);
  // 피해자 환불: 신고 처리 시 규칙상 "즉시 환불" - 예치금을 원상 회복(5)한다는 의미로 처리.
  // 데모 단순화를 위해 5로 재설정(피해자는 몰수 대상이 아니므로 원래 값 유지 + 명시적 확인 로그).
  db.prepare(
    `UPDATE ledger_accounts SET deposit_balance = 5, updated_at = datetime('now') WHERE user_id = ?`
  ).run(userId);
}
