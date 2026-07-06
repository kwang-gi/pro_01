import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET: 관리자용 전체 유저 목록 (잔고 포함)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.display_name, u.gender, u.birth_year, u.region, u.job,
              u.verification_status, u.verification_method, u.created_at,
              l.deposit_balance, l.fee_balance
       FROM users u
       LEFT JOIN ledger_accounts l ON l.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  return NextResponse.json({ users: rows });
}
