import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET: 제안 상세 + 만남 기록
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const proposalId = Number(id);

  const db = getDb();
  const proposal = db
    .prepare(
      `SELECT p.*, a.gender as acq_gender, a.birth_year as acq_birth_year, a.region as acq_region,
              a.job as acq_job, a.intro as acq_intro,
              u.display_name as applicant_name, b.display_name as broker_name
       FROM proposals p
       JOIN acquaintances a ON a.id = p.acquaintance_id
       JOIN users u ON u.id = p.applicant_id
       JOIN users b ON b.id = p.broker_id
       WHERE p.id = ?`
    )
    .get(proposalId) as { applicant_id: number; broker_id: number } | undefined;

  if (!proposal) return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });
  if (
    proposal.applicant_id !== user.id &&
    proposal.broker_id !== user.id &&
    user.role !== "admin"
  ) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const meetings = db
    .prepare(`SELECT * FROM meetings WHERE proposal_id = ? ORDER BY seq ASC`)
    .all(proposalId);

  return NextResponse.json({ proposal, meetings });
}
