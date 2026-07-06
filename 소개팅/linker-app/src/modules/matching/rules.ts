// 도메인 규칙 상수 및 검증 함수 모음 (성비 룰, 쿨타임, 만남 3회 성사 판정 등)
import { getDb } from "@/lib/db";

export const MEETING_TO_MATCH = 3; // 3회 완료 = 성사
export const MONTHLY_COOLTIME_LIMIT = 3; // 동일 지인 월 3회까지만 소개 가능
export const INITIAL_DEPOSIT = 5; // 예치금
export const INITIAL_BROKER_FEE = 1; // 최초 입금 시 선납하는 주선비
export const FINAL_PAYMENT = 5; // 성사 시 잔금
// 사업 기획 확정분: 총 성사비 = 10 (기획서 고정값). 최초 주선비(1)+잔금(5)=6과는 별개로,
// 성사 완료 시 원장에 기록되는 "총 성사비" 자체는 10으로 고정한다.
export const TOTAL_SUCCESS_FEE = 10;
export const DEFAULT_BROKER_RATE = 0.5;

/** 성비 룰: 남자 주선자는 여자 지인만 등록 가능. 여자 주선자는 남녀 모두 가능 */
export function canRegisterAcquaintance(
  brokerGender: "M" | "F",
  acquaintanceGender: "M" | "F"
): boolean {
  if (brokerGender === "M") return acquaintanceGender === "F";
  return true;
}

/** 동일 지인 월 3회 쿨타임 체크: 이번 달 해당 지인으로 생성된 proposal 수가 한도 이상이면 차단 */
export function checkMonthlyCooltime(acquaintanceId: number): {
  ok: boolean;
  countThisMonth: number;
} {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM proposals
       WHERE acquaintance_id = ?
       AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    )
    .get(acquaintanceId) as { c: number };
  return { ok: row.c < MONTHLY_COOLTIME_LIMIT, countThisMonth: row.c };
}

export const PROHIBITED_RULES_TEXT = [
  "돈을 요구하거나 빌려달라고 하면 안 됩니다.",
  "종교를 권유하면 안 됩니다.",
  "사업/투자를 권유하면 안 됩니다.",
  "폭언, 폭력적 언행을 하면 안 됩니다.",
];

export const REALITY_CHECK_TEXT =
  "여기 아이유/박보검 안 나옵니다. 서로 예의를 지키세요.";

export const WARNING_MODAL_TEXT =
  "돈·종교·사업·폭언 한마디면 예치금 전액 몰수됩니다. " + REALITY_CHECK_TEXT;
