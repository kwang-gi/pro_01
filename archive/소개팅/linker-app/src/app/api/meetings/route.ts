import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordMeeting, MatchingError } from "@/modules/matching";
import { createSettlementOnMatch } from "@/modules/settlement";
import { paymentProvider } from "@/modules/payment";
import { FINAL_PAYMENT } from "@/modules/matching/rules";

// POST: 만남 기록 추가 (신청자 또는 주선자가 기록). 3회 완료 시 성사 처리 + 정산 생성 + 잔금 입금 신고 자동 생성[모의]
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { proposal_id, note } = body ?? {};
  if (!proposal_id) return NextResponse.json({ error: "제안 ID가 필요합니다." }, { status: 400 });

  const db = getDb();
  const proposal = db
    .prepare(`SELECT * FROM proposals WHERE id = ?`)
    .get(Number(proposal_id)) as
    | { id: number; applicant_id: number; broker_id: number; status: string }
    | undefined;
  if (!proposal) return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });
  if (proposal.applicant_id !== user.id && proposal.broker_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const result = recordMeeting({
      proposalId: proposal.id,
      note,
      applicantConfirmed: true,
      acquaintanceConfirmed: true,
    });

    if (result.matched) {
      createSettlementOnMatch(proposal.id, proposal.broker_id);
      // 잔금(5) 입금 신고를 자동 생성 -> 신청자가 관리자 확인만 기다리면 되도록 [모의]
      await paymentProvider.requestDeposit({
        userId: proposal.applicant_id,
        kind: "final",
        amount: FINAL_PAYMENT,
        memo: "[모의] 성사 잔금 자동 신고",
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof MatchingError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
