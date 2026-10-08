// [모의] 카카오 알림톡 발송 대신, 지인 동의 상태를 DB에 pending으로 두고
// 화면(주선자 목록)에서 "동의됨/거절" 버튼으로 대리 처리한다.
import { getDb } from "@/lib/db";
import type { NotifyProvider } from "./types";

export class MockAlimtalk implements NotifyProvider {
  async sendConsentRequest(acquaintanceId: number): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE acquaintances SET consent_status = 'pending' WHERE id = ?`).run(
      acquaintanceId
    );
    // 실제로는 여기서 알림톡 API 호출. 지금은 로그만 남김.
    console.log(`[모의 알림톡] 지인(#${acquaintanceId})에게 동의 요청 발송`);
  }

  async respondConsent(acquaintanceId: number, agreed: boolean): Promise<void> {
    const db = getDb();
    db.prepare(`UPDATE acquaintances SET consent_status = ? WHERE id = ?`).run(
      agreed ? "agreed" : "declined",
      acquaintanceId
    );
  }
}

export const notifyProvider: NotifyProvider = new MockAlimtalk();
