import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createNotice } from "@/modules/notice";

// POST: 관리자가 공지 작성
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "관리자만 작성할 수 있습니다." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { title, content } = body ?? {};
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }
  const id = createNotice(title, content);
  return NextResponse.json({ ok: true, id });
}
