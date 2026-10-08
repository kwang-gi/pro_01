import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReport, type ReportCategory } from "@/modules/report";

const VALID_CATEGORIES: ReportCategory[] = ["violence", "proselytize", "business", "money"];

// POST: 신고 접수 (4대 조항)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { accused_id, proposal_id, category, content } = body ?? {};
  if (!accused_id || !category || !content) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "신고 유형이 올바르지 않습니다." }, { status: 400 });
  }

  const id = createReport({
    reporterId: user.id,
    accusedId: Number(accused_id),
    proposalId: proposal_id ? Number(proposal_id) : undefined,
    category,
    content,
  });
  return NextResponse.json({ ok: true, id });
}
