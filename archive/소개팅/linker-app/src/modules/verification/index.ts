export * from "./types";
export { smsVerification } from "./MockSmsVerification";
export {
  registeredMailVerification,
  approveRegisteredMail,
  rejectRegisteredMail,
} from "./MockRegisteredMail";

import type { Role } from "@/lib/auth";
import { smsVerification } from "./MockSmsVerification";
import { registeredMailVerification } from "./MockRegisteredMail";

/** 역할에 맞는 인증 Provider 선택. 규칙: 여성 신청자=문자인증, 남성 신청자·주선자(성별무관)=등기인증 */
export function pickVerificationProvider(role: Role) {
  if (role === "female_applicant") {
    return smsVerification;
  }
  // male_applicant, broker, admin(가입경로 없음) -> 등기인증
  return registeredMailVerification;
}
