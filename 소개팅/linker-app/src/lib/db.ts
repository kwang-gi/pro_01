// 전역 SQLite 연결. Next.js dev 핫리로드 시 커넥션 중복 생성을 막기 위해 globalThis에 캐시.
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { seedIfEmpty } from "./seed";

const DB_PATH = path.join(process.cwd(), "data", "linker.db");

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createConnection(): Database.Database {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var __linkerDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__linkerDb) {
    global.__linkerDb = createConnection();
    initSchema(global.__linkerDb);
    seedIfEmpty(global.__linkerDb);
  }
  return global.__linkerDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- 데모용 평문 저장 [모의] (실서비스 전환 시 반드시 해시로 교체)
    role TEXT NOT NULL CHECK (role IN ('male_applicant','female_applicant','broker','admin')),
    display_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('M','F')),
    birth_year INTEGER,
    region TEXT,
    job TEXT,
    -- 가입 인증 상태: pending(대기) / active(활성) / rejected(반려)
    verification_status TEXT NOT NULL DEFAULT 'pending',
    verification_method TEXT, -- 'sms' | 'registered_mail'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ledger_accounts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    deposit_balance INTEGER NOT NULL DEFAULT 0, -- 예치금(5)
    fee_balance INTEGER NOT NULL DEFAULT 0,     -- 주선비 선납(1) 등 별도 관리용
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deposit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL, -- 'initial'(예치금5+주선비1) | 'final'(잔금5)
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | rejected
    memo TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    confirmed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS acquaintances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id INTEGER NOT NULL REFERENCES users(id),
    gender TEXT NOT NULL CHECK (gender IN ('M','F')),
    birth_year INTEGER NOT NULL,
    region TEXT NOT NULL,
    job TEXT NOT NULL,
    intro TEXT NOT NULL,
    -- 지인 동의 상태 (알림톡 모의)
    consent_status TEXT NOT NULL DEFAULT 'pending', -- pending | agreed | declined
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id INTEGER NOT NULL REFERENCES users(id),
    acquaintance_id INTEGER NOT NULL REFERENCES acquaintances(id),
    applicant_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'proposed', -- proposed | accepted | declined | in_progress | matched | ended
    meeting_count INTEGER NOT NULL DEFAULT 0,
    warning_ack INTEGER NOT NULL DEFAULT 0, -- 금지조항 경고 팝업 확인 여부
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    matched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL REFERENCES proposals(id),
    seq INTEGER NOT NULL, -- 1~3
    applicant_confirmed INTEGER NOT NULL DEFAULT 0,
    acquaintance_confirmed INTEGER NOT NULL DEFAULT 0, -- 주선자가 지인측 확인 대리 입력
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL REFERENCES proposals(id),
    broker_id INTEGER NOT NULL REFERENCES users(id),
    total_fee INTEGER NOT NULL DEFAULT 10, -- 성사비 총액(주선비1+잔금5 == 실제로는 합계 개념, 기본 10)
    broker_rate REAL NOT NULL DEFAULT 0.5, -- 주선자 분배 비율 기본 50%
    broker_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending(정산대기) | paid(지급완료)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    accused_id INTEGER NOT NULL REFERENCES users(id),
    proposal_id INTEGER REFERENCES proposals(id),
    category TEXT NOT NULL CHECK (category IN ('violence','proselytize','business','money')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | dismissed
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_auto INTEGER NOT NULL DEFAULT 0, -- 몰수 자동 공지 여부
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}
