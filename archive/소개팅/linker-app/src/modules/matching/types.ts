export interface Acquaintance {
  id: number;
  broker_id: number;
  gender: "M" | "F";
  birth_year: number;
  region: string;
  job: string;
  intro: string;
  consent_status: "pending" | "agreed" | "declined";
  created_at: string;
}

export interface Proposal {
  id: number;
  broker_id: number;
  acquaintance_id: number;
  applicant_id: number;
  status: "proposed" | "accepted" | "declined" | "in_progress" | "matched" | "ended";
  meeting_count: number;
  warning_ack: number;
  created_at: string;
  accepted_at: string | null;
  matched_at: string | null;
}

export interface Meeting {
  id: number;
  proposal_id: number;
  seq: number;
  applicant_confirmed: number;
  acquaintance_confirmed: number;
  note: string | null;
  created_at: string;
}
