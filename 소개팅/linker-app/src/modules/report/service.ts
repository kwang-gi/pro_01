// 무관용 신고 접수 모듈. 4대 조항: 폭력(violence)/포교(proselytize)/사업(business)/돈(money)
import { getDb } from "@/lib/db";
import { confiscateDeposit, refundVictimImmediately } from "@/modules/settlement/service";

export type ReportCategory = "violence" | "proselytize" | "business" | "money";

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  violence: "폭력/폭언",
  proselytize: "포교/종교 권유",
  business: "사업/투자 권유",
  money: "금전 요구",
};

export function createReport(params: {
  reporterId: number;
  accusedId: number;
  proposalId?: number;
  category: ReportCategory;
  content: string;
}) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO reports (reporter_id, accused_id, proposal_id, category, content, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    )
    .run(
      params.reporterId,
      params.accusedId,
      params.proposalId ?? null,
      params.category,
      params.content
    );
  return info.lastInsertRowid as number;
}

export function listReports() {
  const db = getDb();
  return db
    .prepare(
      `SELECT r.*, ru.display_name as reporter_name, au.display_name as accused_name
       FROM reports r
       JOIN users ru ON ru.id = r.reporter_id
       JOIN users au ON au.id = r.accused_id
       ORDER BY r.created_at DESC`
    )
    .all();
}

/** 관리자가 4대 조항 판정 확정: 가해자 예치금 몰수 + 해당 주선자 연대 몰수 + 자동 전체 공지 + 피해자 즉시 환불 */
export function confirmReportAndPunish(reportId: number) {
  const db = getDb();
  const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId) as
    | {
        id: number;
        reporter_id: number;
        accused_id: number;
        proposal_id: number | null;
        category: ReportCategory;
        status: string;
      }
    | undefined;
  if (!report) throw new Error("신고 내역을 찾을 수 없습니다.");
  if (report.status !== "pending") throw new Error("이미 처리된 신고입니다.");

  const tx = db.transaction(() => {
    // 가해자 예치금 몰수
    const confiscatedAccused = confiscateDeposit(report.accused_id);

    // 연대 몰수: 해당 건의 주선자
    let brokerId: number | null = null;
    let confiscatedBroker = 0;
    if (report.proposal_id) {
      const proposal = db
        .prepare(`SELECT broker_id FROM proposals WHERE id = ?`)
        .get(report.proposal_id) as { broker_id: number } | undefined;
      if (proposal) {
        brokerId = proposal.broker_id;
        confiscatedBroker = confiscateDeposit(proposal.broker_id);
      }
    }

    // 피해자(신고자) 예치금 즉시 환불
    refundVictimImmediately(report.reporter_id);

    // 신고 상태 확정
    db.prepare(
      `UPDATE reports SET status = 'confirmed', resolved_at = datetime('now') WHERE id = ?`
    ).run(reportId);

    // 자동 전체 공지 생성
    const accusedUser = db
      .prepare(`SELECT display_name FROM users WHERE id = ?`)
      .get(report.accused_id) as { display_name: string } | undefined;
    const categoryLabelMap: Record<ReportCategory, string> = {
      violence: "폭력/폭언",
      proselytize: "포교/종교 권유",
      business: "사업/투자 권유",
      money: "금전 요구",
    };
    db.prepare(
      `INSERT INTO notices (title, content, is_auto) VALUES (?, ?, 1)`
    ).run(
      "[자동공지] 금지행위 적발에 따른 예치금 몰수 안내",
      `${accusedUser?.display_name ?? "회원"}의 금지행위(${categoryLabelMap[report.category]})가 확인되어 예치금 전액이 몰수되었습니다. (몰수액: ${confiscatedAccused})` +
        (brokerId ? ` 해당 주선 건의 주선자도 연대 몰수 처리되었습니다. (몰수액: ${confiscatedBroker})` : "") +
        " 만남에서는 항상 서로 예의를 지켜주시기 바랍니다."
    );
  });
  tx();
}

export function dismissReport(reportId: number) {
  const db = getDb();
  db.prepare(
    `UPDATE reports SET status = 'dismissed', resolved_at = datetime('now') WHERE id = ?`
  ).run(reportId);
}
