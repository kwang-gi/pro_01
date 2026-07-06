export interface NotifyProvider {
  /** 지인에게 동의 요청 알림 발송 (등록 시 자동 호출) */
  sendConsentRequest(acquaintanceId: number): Promise<void>;
  /** 지인이 동의/거절 처리 (모의 화면에서 버튼으로) */
  respondConsent(acquaintanceId: number, agreed: boolean): Promise<void>;
}
