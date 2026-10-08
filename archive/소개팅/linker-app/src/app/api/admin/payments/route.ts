import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET: 관리자용 입금 신고 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT d.*, u.display_name as user_name
       FROM deposit_requests d JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC`
    )
    .all();
  return NextResponse.json({ requests: rows });
}
