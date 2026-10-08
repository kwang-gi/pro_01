import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET: 주선자가 소개 제안을 보낼 대상(활성 상태 신청자) 목록. 성별 쿼리 필터 지원(?gender=F)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 조회할 수 있습니다." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const gender = searchParams.get("gender");

  const db = getDb();
  const rows = gender
    ? db
        .prepare(
          `SELECT id, display_name, gender, birth_year, region, job FROM users
           WHERE role IN ('male_applicant','female_applicant') AND verification_status = 'active' AND gender = ?`
        )
        .all(gender)
    : db
        .prepare(
          `SELECT id, display_name, gender, birth_year, region, job FROM users
           WHERE role IN ('male_applicant','female_applicant') AND verification_status = 'active'`
        )
        .all();
  return NextResponse.json({ applicants: rows });
}
