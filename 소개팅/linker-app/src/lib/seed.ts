// 시드 데이터: 앱 최초 실행 시 users 테이블이 비어있으면 자동 주입.
import type Database from "better-sqlite3";

export function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (username, password, role, display_name, gender, birth_year, region, job, verification_status, verification_method)
    VALUES (@username, @password, @role, @display_name, @gender, @birth_year, @region, @job, @verification_status, @verification_method)
  `);
  const insertLedger = db.prepare(
    `INSERT INTO ledger_accounts (user_id, deposit_balance, fee_balance) VALUES (?, ?, ?)`
  );

  const users = [
    {
      username: "admin",
      password: "admin123",
      role: "admin",
      display_name: "관리자",
      gender: "F",
      birth_year: 1990,
      region: "서울",
      job: "운영자",
      verification_status: "active",
      verification_method: null,
    },
    {
      username: "broker_m",
      password: "1234",
      role: "broker",
      display_name: "김주선(남)",
      gender: "M",
      birth_year: 1985,
      region: "서울",
      job: "자영업",
      verification_status: "active",
      verification_method: "registered_mail",
    },
    {
      username: "broker_f",
      password: "1234",
      role: "broker",
      display_name: "이주선(여)",
      gender: "F",
      birth_year: 1988,
      region: "경기",
      job: "회사원",
      verification_status: "active",
      verification_method: "registered_mail",
    },
    {
      username: "male1",
      password: "1234",
      role: "male_applicant",
      display_name: "박신청(남1)",
      gender: "M",
      birth_year: 1992,
      region: "서울",
      job: "개발자",
      verification_status: "active",
      verification_method: "registered_mail",
    },
    {
      username: "male2",
      password: "1234",
      role: "male_applicant",
      display_name: "최신청(남2)",
      gender: "M",
      birth_year: 1990,
      region: "인천",
      job: "공무원",
      verification_status: "pending",
      verification_method: "registered_mail",
    },
    {
      username: "female1",
      password: "1234",
      role: "female_applicant",
      display_name: "정신청(여1)",
      gender: "F",
      birth_year: 1993,
      region: "서울",
      job: "디자이너",
      verification_status: "active",
      verification_method: "sms",
    },
    {
      username: "female2",
      password: "1234",
      role: "female_applicant",
      display_name: "한신청(여2)",
      gender: "F",
      birth_year: 1995,
      region: "부산",
      job: "간호사",
      verification_status: "active",
      verification_method: "sms",
    },
  ];

  const ids: Record<string, number> = {};
  for (const u of users) {
    const info = insertUser.run(u);
    ids[u.username] = info.lastInsertRowid as number;
    // 활성 유저는 예치금 계좌 개설, male2(승인대기)는 잔고 0
    if (u.verification_status === "active") {
      // 신청자는 예치금5+주선비1 입금 확인된 상태로 시드 (male1, female1, female2)
      if (u.role === "male_applicant" || u.role === "female_applicant") {
        insertLedger.run(ids[u.username], 5, 1);
      } else {
        insertLedger.run(ids[u.username], 0, 0);
      }
    } else {
      insertLedger.run(ids[u.username], 0, 0);
    }
  }

  // 지인 3명 (broker_m은 여자 지인만, broker_f는 남녀 가능 룰 반영)
  const insertAcq = db.prepare(`
    INSERT INTO acquaintances (broker_id, gender, birth_year, region, job, intro, consent_status)
    VALUES (@broker_id, @gender, @birth_year, @region, @job, @intro, @consent_status)
  `);
  const acqs = [
    {
      broker_id: ids["broker_m"],
      gender: "F",
      birth_year: 1994,
      region: "서울",
      job: "교사",
      intro: "차분하고 다정한 성격, 취미는 독서와 산책",
      consent_status: "agreed",
    },
    {
      broker_id: ids["broker_f"],
      gender: "F",
      birth_year: 1991,
      region: "경기",
      job: "약사",
      intro: "밝고 활발함, 여행을 좋아함",
      consent_status: "agreed",
    },
    {
      broker_id: ids["broker_f"],
      gender: "M",
      birth_year: 1989,
      region: "서울",
      job: "회계사",
      intro: "성실하고 꼼꼼한 성격, 운동을 좋아함",
      consent_status: "pending",
    },
  ];
  const acqIds: number[] = [];
  for (const a of acqs) {
    const info = insertAcq.run(a);
    acqIds.push(info.lastInsertRowid as number);
  }

  // 진행 중 소개 1건: broker_m이 등록한 여자 지인(acqIds[0]) -> male1에게 제안, 이미 수락되어 진행중
  const insertProposal = db.prepare(`
    INSERT INTO proposals (broker_id, acquaintance_id, applicant_id, status, meeting_count, warning_ack, accepted_at)
    VALUES (?, ?, ?, 'in_progress', 1, 1, datetime('now'))
  `);
  const propInfo = insertProposal.run(ids["broker_m"], acqIds[0], ids["male1"]);
  const proposalId = propInfo.lastInsertRowid as number;

  // 주선비 1 차감 (수락 시점 반영) - male1 fee_balance 이미 1 시드했으므로 0으로 차감
  db.prepare("UPDATE ledger_accounts SET fee_balance = fee_balance - 1 WHERE user_id = ?").run(
    ids["male1"]
  );

  // 만남 1회 기록 (양측 확인 완료)
  db.prepare(
    `INSERT INTO meetings (proposal_id, seq, applicant_confirmed, acquaintance_confirmed, note) VALUES (?, 1, 1, 1, '1차 만남 - 카페에서 티타임')`
  ).run(proposalId);

  // 공지 1건 기본 안내
  db.prepare(
    `INSERT INTO notices (title, content, is_auto) VALUES (?, ?, 0)`
  ).run(
    "서비스 이용 안내",
    "만남(가칭 Linker)에 오신 것을 환영합니다. 서로 예의를 지켜주세요. 금지행위(폭력/포교/사업권유/금전요구) 적발 시 예치금 전액이 몰수됩니다."
  );
}
