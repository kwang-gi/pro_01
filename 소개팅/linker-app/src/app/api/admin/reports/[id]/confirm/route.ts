import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { confirmReportAndPunish } from "@/modules/report";

// POST: 관리자가 4대 조항 판정 확정 -> 몰수+연대몰수+자동공지+피해자환불 일괄 처리
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    confirmReportAndPunish(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "처리 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
