import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPendingSettlements } from "@/modules/settlement";

// GET: 주선자 본인의 정산 현황
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 조회할 수 있습니다." }, { status: 403 });
  }
  return NextResponse.json({ settlements: listPendingSettlements(user.id) });
}
