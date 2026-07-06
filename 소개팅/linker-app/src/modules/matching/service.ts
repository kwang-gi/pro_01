// matching 모듈 핵심 서비스 로직. 소개 제안 -> 수락 -> 만남기록 -> 성사 판정까지.
import { getDb } from "@/lib/db";
import {
  canRegisterAcquaintance,
  checkMonthlyCooltime,
  MEETING_TO_MATCH,
} from "./rules";

export class MatchingError extends Error {}

export function registerAcquaintance(params: {
  brokerId: number;
  brokerGender: "M" | "F";
  gender: "M" | "F";
  birthYear: number;
  region: string;
  job: string;
  intro: string;
}) {
  if (!canRegisterAcquaintance(params.brokerGender, params.gender)) {
    throw new MatchingError(
      "남자 주선자는 여자 지인만 등록할 수 있습니다."
    );
  }
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO acquaintances (broker_id, gender, birth_year, region, job, intro, consent_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    )
    .run(params.brokerId, params.gender, params.birthYear, params.region, params.job, params.intro);
  return info.lastInsertRowid as number;
}

export function createProposal(params: {
  brokerId: number;
  acquaintanceId: number;
  applicantId: number;
}) {
  const db = getDb();

  const acq = db
    .prepare(`SELECT * FROM acquaintances WHERE id = ?`)
    .get(params.acquaintanceId) as
    | { id: number; broker_id: number; consent_status: string }
    | undefined;
  if (!acq) throw new MatchingError("지인 정보를 찾을 수 없습니다.");
  if (acq.broker_id !== params.brokerId) {
    throw new MatchingError("본인이 등록한 지인만 소개할 수 있습니다.");
  }
  if (acq.consent_status !== "agreed") {
    throw new MatchingError("지인의 동의가 완료되어야 소개할 수 있습니다.");
  }

  const cooltime = checkMonthlyCooltime(params.acquaintanceId);
  if (!cooltime.ok) {
    throw new MatchingError(
      `동일 지인은 월 ${cooltime.countThisMonth}회 이미 소개되어 이번 달은 더 이상 소개할 수 없습니다.`
    );
  }

  const applicant = db
    .prepare(`SELECT id, verification_status FROM users WHERE id = ?`)
    .get(params.applicantId) as { id: number; verification_status: string } | undefined;
  if (!applicant) throw new MatchingError("신청자를 찾을 수 없습니다.");
  if (applicant.verification_status !== "active") {
    throw new MatchingError("신청자가 아직 활성 상태가 아닙니다(가입 승인 대기중).");
  }

  const info = db
    .prepare(
      `INSERT INTO proposals (broker_id, acquaintance_id, applicant_id, status) VALUES (?, ?, ?, 'proposed')`
    )
    .run(params.brokerId, params.acquaintanceId, params.applicantId);
  return info.lastInsertRowid as number;
}

export function acceptProposal(proposalId: number, applicantId: number) {
  const db = getDb();
  const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(proposalId) as
    | { id: number; applicant_id: number; status: string }
    | undefined;
  if (!proposal) throw new MatchingError("제안을 찾을 수 없습니다.");
  if (proposal.applicant_id !== applicantId) throw new MatchingError("본인의 제안만 수락할 수 있습니다.");
  if (proposal.status !== "proposed") throw new MatchingError("이미 처리된 제안입니다.");

  const ledger = db
    .prepare(`SELECT fee_balance FROM ledger_accounts WHERE user_id = ?`)
    .get(applicantId) as { fee_balance: number } | undefined;
  if (!ledger || ledger.fee_balance < 1) {
    throw new MatchingError("주선비 잔액이 부족합니다. 입금 확인 후 다시 시도하세요.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE ledger_accounts SET fee_balance = fee_balance - 1, updated_at = datetime('now') WHERE user_id = ?`
    ).run(applicantId);
    db.prepare(
      `UPDATE proposals SET status = 'accepted', accepted_at = datetime('now') WHERE id = ?`
    ).run(proposalId);
  });
  tx();
}

export function declineProposal(proposalId: number, applicantId: number) {
  const db = getDb();
  const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(proposalId) as
    | { id: number; applicant_id: number; status: string }
    | undefined;
  if (!proposal) throw new MatchingError("제안을 찾을 수 없습니다.");
  if (proposal.applicant_id !== applicantId) throw new MatchingError("본인의 제안만 거절할 수 있습니다.");
  db.prepare(`UPDATE proposals SET status = 'declined' WHERE id = ?`).run(proposalId);
}

export function ackWarning(proposalId: number) {
  const db = getDb();
  db.prepare(`UPDATE proposals SET warning_ack = 1, status = 'in_progress' WHERE id = ?`).run(
    proposalId
  );
}

export function recordMeeting(params: {
  proposalId: number;
  note?: string;
  applicantConfirmed?: boolean;
  acquaintanceConfirmed?: boolean;
}) {
  const db = getDb();
  const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(params.proposalId) as
    | { id: number; meeting_count: number; status: string; warning_ack: number }
    | undefined;
  if (!proposal) throw new MatchingError("제안을 찾을 수 없습니다.");
  if (proposal.warning_ack !== 1) {
    throw new MatchingError("금지조항 경고 확인 후 만남을 기록할 수 있습니다.");
  }
  if (proposal.meeting_count >= MEETING_TO_MATCH) {
    throw new MatchingError("이미 3회 만남이 완료되어 성사 처리되었습니다.");
  }

  const nextSeq = proposal.meeting_count + 1;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO meetings (proposal_id, seq, applicant_confirmed, acquaintance_confirmed, note)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      params.proposalId,
      nextSeq,
      params.applicantConfirmed ? 1 : 0,
      params.acquaintanceConfirmed ? 1 : 0,
      params.note ?? null
    );

    const newStatus = nextSeq >= MEETING_TO_MATCH ? "matched" : "in_progress";
    db.prepare(
      `UPDATE proposals SET meeting_count = ?, status = ?, matched_at = CASE WHEN ? >= ${MEETING_TO_MATCH} THEN datetime('now') ELSE matched_at END WHERE id = ?`
    ).run(nextSeq, newStatus, nextSeq, params.proposalId);
  });
  tx();

  return { seq: nextSeq, matched: nextSeq >= MEETING_TO_MATCH };
}

export function brokerSuccessRate(brokerId: number): {
  totalProposals: number;
  matchedCount: number;
  rate: number;
} {
  const db = getDb();
  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM proposals WHERE broker_id = ?`).get(brokerId) as {
      c: number;
    }
  ).c;
  const matched = (
    db
      .prepare(`SELECT COUNT(*) as c FROM proposals WHERE broker_id = ? AND status = 'matched'`)
      .get(brokerId) as { c: number }
  ).c;
  return {
    totalProposals: total,
    matchedCount: matched,
    rate: total === 0 ? 0 : Math.round((matched / total) * 1000) / 10,
  };
}
