// [모의] 남성·주선자용 등기인증. 가입 시 "등기 발송 대기(pending)" 상태로 두고
// 관리자가 /admin 에서 승인 버튼을 눌러야 active 로 전환된다.
import { getDb } from "@/lib/db";
import type { VerificationProvider } from "./types";

export class MockRegisteredMail implements VerificationProvider {
  method = "registered_mail" as const;

  async requestVerification(userId: number) {
    const db = getDb();
    db.prepare(`UPDATE users SET verification_status = 'pending' WHERE id = ?`).run(userId);
    return { status: "pending" as const };
  }
}

export function approveRegisteredMail(userId: number) {
  const db = getDb();
  db.prepare(`UPDATE users SET verification_status = 'active' WHERE id = ?`).run(userId);
}

export function rejectRegisteredMail(userId: number) {
  const db = getDb();
  db.prepare(`UPDATE users SET verification_status = 'rejected' WHERE id = ?`).run(userId);
}

export const registeredMailVerification = new MockRegisteredMail();
