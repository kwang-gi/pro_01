import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pickVerificationProvider } from "@/modules/verification";
import type { Role } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { username, password, role, display_name, gender, birth_year, region, job } = body ?? {};

  if (!username || !password || !role || !display_name || !gender) {
    return NextResponse.json({ error: "필수 항목을 모두 입력하세요." }, { status: 400 });
  }
  const validRoles: Role[] = ["male_applicant", "female_applicant", "broker"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "역할이 올바르지 않습니다." }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const info = db
    .prepare(
      `INSERT INTO users (username, password, role, display_name, gender, birth_year, region, job, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    )
    .run(username, password, role, display_name, gender, birth_year ?? null, region ?? null, job ?? null);
  const userId = info.lastInsertRowid as number;

  db.prepare(
    `INSERT OR IGNORE INTO ledger_accounts (user_id, deposit_balance, fee_balance) VALUES (?, 0, 0)`
  ).run(userId);

  const provider = pickVerificationProvider(role as Role);
  const result = await provider.requestVerification(userId);

  return NextResponse.json({
    ok: true,
    userId,
    verification: result,
    message:
      result.status === "active"
        ? "가입 완료(문자인증 처리됨 [모의]). 로그인해주세요."
        : "가입 신청 완료. 등기 발송 대기 상태이며 관리자 승인 후 이용 가능합니다 [모의].",
  });
}
