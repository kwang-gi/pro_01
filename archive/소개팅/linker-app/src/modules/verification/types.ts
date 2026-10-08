export type VerificationMethod = "sms" | "registered_mail";
export type VerificationStatus = "pending" | "active" | "rejected";

export interface VerificationProvider {
  method: VerificationMethod;
  /** 가입 시 인증 요청 시작 */
  requestVerification(userId: number): Promise<{ status: VerificationStatus }>;
}
