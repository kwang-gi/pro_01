import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listReports } from "@/modules/report";

// GET: 관리자용 신고 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }
  return NextResponse.json({ reports: listReports() });
}
