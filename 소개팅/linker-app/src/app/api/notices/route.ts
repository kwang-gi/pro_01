import { NextResponse } from "next/server";
import { listNotices } from "@/modules/notice";

// GET: 전체 공지 목록 (로그인 불필요, 누구나 조회 가능)
export async function GET() {
  const notices = listNotices();
  return NextResponse.json({ notices });
}
