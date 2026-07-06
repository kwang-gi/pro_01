import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectRegisteredMail } from "@/modules/verification";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  rejectRegisteredMail(Number(id));
  return NextResponse.json({ ok: true });
}
