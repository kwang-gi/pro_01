import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPendingSettlements } from "@/modules/settlement";

// GET: 관리자용 전체 정산 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }
  return NextResponse.json({ settlements: listPendingSettlements() });
}
