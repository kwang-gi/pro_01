import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptProposal, MatchingError } from "@/modules/matching";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "male_applicant" && user.role !== "female_applicant")) {
    return NextResponse.json({ error: "신청자만 수락할 수 있습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    acceptProposal(Number(id), user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MatchingError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
