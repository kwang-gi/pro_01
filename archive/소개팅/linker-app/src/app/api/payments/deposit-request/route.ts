import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { paymentProvider } from "@/modules/payment";
import { INITIAL_DEPOSIT, INITIAL_BROKER_FEE } from "@/modules/matching/rules";

// GET: 내 입금 신고 내역 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY created_at DESC`)
    .all(user.id);
  return NextResponse.json({ requests: rows });
}

// POST: 신청자가 최초 입금(예치금5+주선비1=6) 을 신고. 관리자 확인 전까지 pending.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role !== "male_applicant" && user.role !== "female_applicant") {
    return NextResponse.json({ error: "신청자만 입금 신고를 할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "final" ? "final" : "initial";
  const amount = kind === "initial" ? INITIAL_DEPOSIT + INITIAL_BROKER_FEE : Number(body.amount) || 5;

  const result = await paymentProvider.requestDeposit({
    userId: user.id,
    kind,
    amount,
    memo: body.memo ?? "[모의] 입금 신고",
  });
  return NextResponse.json({ ok: true, ...result });
}
