import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { registerAcquaintance, MatchingError } from "@/modules/matching";
import { notifyProvider } from "@/modules/notify";

// GET: 로그인한 주선자의 지인 목록 조회
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 조회할 수 있습니다." }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM acquaintances WHERE broker_id = ? ORDER BY created_at DESC`)
    .all(user.id);
  return NextResponse.json({ acquaintances: rows });
}

// POST: 지인 등록 (성비 룰 검증 포함) + 동의 요청 알림 발송[모의]
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "broker") {
    return NextResponse.json({ error: "주선자만 등록할 수 있습니다." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { gender, birth_year, region, job, intro } = body ?? {};
  if (!gender || !birth_year || !region || !job || !intro) {
    return NextResponse.json({ error: "모든 항목을 입력하세요." }, { status: 400 });
  }

  try {
    const id = registerAcquaintance({
      brokerId: user.id,
      brokerGender: user.gender,
      gender,
      birthYear: Number(birth_year),
      region,
      job,
      intro,
    });
    await notifyProvider.sendConsentRequest(id);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof MatchingError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
