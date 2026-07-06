// 전체 공지 게시판 모듈
import { getDb } from "@/lib/db";

export function listNotices() {
  const db = getDb();
  return db.prepare(`SELECT * FROM notices ORDER BY created_at DESC`).all();
}

export function createNotice(title: string, content: string) {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO notices (title, content, is_auto) VALUES (?, ?, 0)`)
    .run(title, content);
  return info.lastInsertRowid as number;
}
