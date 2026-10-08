// 초간단 세션 인증 [모의] — 아이디+비번, 쿠키 토큰. 실서비스 전환 시 NextAuth 등으로 교체 권장.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "linker_session";

export type Role = "male_applicant" | "female_applicant" | "broker" | "admin";

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  display_name: string;
  gender: "M" | "F";
  verification_status: string;
}

export function createSession(userId: number): string {
  const token = randomBytes(24).toString("hex");
  const db = getDb();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function destroySession(token: string) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.display_name, u.gender, u.verification_status
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as SessionUser | undefined;
  return row ?? null;
}
