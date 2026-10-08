import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createProposal, MatchingError } from "@/modules/matching";

// GET: 로그인 유저에 따라 관련 제안 목록 반환 (신청자=받은 제안, 주선자=보낸 제안)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const db = getDb();
  let rows;
  if (user.role === "broker") {
    rows = db
      .prepare(
        `SELECT p.*, a.gender as acq_gender, a.birth_year as acq_birth_year, a.region as acq_region, a.job as acq_job,
                u.display_name as applicant_name
         FROM proposals p
         JOIN acquaintances a ON a.id = p.acquaintance_id
         JOIN users u ON u.id = p.applicant_id
         WHERE p.broker_id = ?
         ORDER BY p.created_at DESC`
      )
      .all(user.id);
  } else {
    rows = db
      .prepare(
        `SELECT p.*, a.gender as acq_gender, a.birth_year as acq_birth_year, a.region as acq_region, a.job as acq_job, a.intro as acq_intro,
                b.display_name as broker_name
         FROM proposals p
         JOIN acquaintances a ON a.id = p.acquaintance_id
         JOIN users b ON b.id = p.broker_id
         WHERE p.applicant_id = ?
         ORDER BY p.created_at DESC`
      )
      .all(user.id);
  }
  return NextResponse.json({ proposals: rows });
}

// POST: 주선자가 신청자에게 소개 제안 생성
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 제안을 보낼 수 있습니다." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { acquaintance_id, applicant_id } = body ?? {};
  if (!acquaintance_id || !applicant_id) {
    return NextResponse.json({ error: "지인과 신청자를 선택하세요." }, { status: 400 });
  }

  try {
    const id = createProposal({
      brokerId: user.id,
      acquaintanceId: Number(acquaintance_id),
      applicantId: Number(applicant_id),
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof MatchingError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
