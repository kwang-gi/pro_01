import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifyProvider } from "@/modules/notify";

// PATCH: 지인 동의 처리 (화면에서 "동의됨으로 처리" 버튼 -> 모의 알림톡 응답)
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 처리할 수 있습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const acquaintanceId = Number(id);
  const body = await req.json().catch(() => ({}));
  const agreed = body.agreed !== false;

  const db = getDb();
  const acq = db
    .prepare(`SELECT broker_id FROM acquaintances WHERE id = ?`)
    .get(acquaintanceId) as { broker_id: number } | undefined;
  if (!acq) return NextResponse.json({ error: "지인을 찾을 수 없습니다." }, { status: 404 });
  if (acq.broker_id !== user.id) {
    return NextResponse.json({ error: "본인이 등록한 지인만 처리할 수 있습니다." }, { status: 403 });
  }

  await notifyProvider.respondConsent(acquaintanceId, agreed);
  return NextResponse.json({ ok: true });
}
