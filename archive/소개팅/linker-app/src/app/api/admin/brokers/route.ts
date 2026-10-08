import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { brokerSuccessRate } from "@/modules/matching";

// GET: 관리자용 주선자 목록 + 성사율
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }
  const db = getDb();
  const brokers = db
    .prepare(`SELECT id, username, display_name, gender, verification_status FROM users WHERE role = 'broker'`)
    .all() as { id: number; username: string; display_name: string; gender: string; verification_status: string }[];

  const result = brokers.map((b) => ({
    ...b,
    ...brokerSuccessRate(b.id),
  }));
  return NextResponse.json({ brokers: result });
}
