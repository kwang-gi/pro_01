import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ackWarning } from "@/modules/matching";

// POST: 만남 확정 직전 금지조항 경고 팝업 확인 처리
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const proposalId = Number(id);

  const db = getDb();
  const proposal = db
    .prepare(`SELECT applicant_id, broker_id FROM proposals WHERE id = ?`)
    .get(proposalId) as { applicant_id: number; broker_id: number } | undefined;
  if (!proposal) return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });
  if (proposal.applicant_id !== user.id && proposal.broker_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  ackWarning(proposalId);
  return NextResponse.json({ ok: true });
}
