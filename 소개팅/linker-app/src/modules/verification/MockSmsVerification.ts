// [모의] 여성 신청자용 문자인증. 실제 SMS 발송 없이 즉시 active 처리(데모 편의).
import { getDb } from "@/lib/db";
import type { VerificationProvider } from "./types";

export class MockSmsVerification implements VerificationProvider {
  method = "sms" as const;

  async requestVerification(userId: number) {
    const db = getDb();
    // 문자인증은 즉시 활성화되는 것으로 모의 처리 (실제로는 인증번호 검증 단계 필요)
    db.prepare(`UPDATE users SET verification_status = 'active' WHERE id = ?`).run(userId);
    return { status: "active" as const };
  }
}

export const smsVerification = new MockSmsVerification();
