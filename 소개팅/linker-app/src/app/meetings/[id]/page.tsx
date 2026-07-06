"use client";
import { useEffect, useState, useCallback, use as usePromise } from "react";
import WarningModal from "@/components/WarningModal";

interface ProposalDetail {
  id: number;
  status: string;
  meeting_count: number;
  warning_ack: number;
  applicant_name: string;
  broker_name: string;
  acq_gender: string;
  acq_birth_year: number;
  acq_region: string;
  acq_job: string;
  acq_intro: string;
  applicant_id: number;
  broker_id: number;
}

interface Meeting {
  id: number;
  seq: number;
  note: string | null;
  created_at: string;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportCategory, setReportCategory] = useState("money");
  const [reportContent, setReportContent] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}`);
    const data = await res.json();
    if (res.ok) {
      setProposal(data.proposal);
      setMeetings(data.meetings);
    } else {
      setMsg(data.error);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function ackWarning() {
    await fetch(`/api/proposals/${id}/ack-warning`, { method: "POST" });
    setShowWarning(false);
    load();
  }

  async function submitMeeting() {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal_id: id, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error);
      return;
    }
    setNote("");
    setMsg(
      data.matched
        ? "3회 만남 완료! 성사 처리되었고 잔금(5) 입금 신고가 자동 생성되었습니다. [모의]"
        : `${data.seq}회차 만남이 기록되었습니다.`
    );
    load();
  }

  async function submitReport() {
    if (!proposal) return;
    // 상대방을 자동 지정: 신고자가 신청자면 주선자를, 신고자가 주선자면 신청자를 신고 대상으로.
    // (실제로는 "지인/상대방"이 대상이어야 하나 데모 MVP에서는 이 제안과 연결된 상대측 계정을 사용)
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accused_id: proposal.applicant_id,
        proposal_id: proposal.id,
        category: reportCategory,
        content: reportContent,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "신고가 접수되었습니다. 관리자가 확인 후 처리합니다." : data.error);
    setShowReport(false);
    setReportContent("");
  }

  if (!proposal) return <p className="text-gray-400">불러오는 중...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">만남 기록 - 제안 #{proposal.id}</h1>
        <button
          onClick={() => setShowReport(true)}
          className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50"
        >
          신고하기
        </button>
      </div>

      <section className="border rounded-lg p-4">
        <p className="text-sm text-gray-600">
          신청자: {proposal.applicant_name} · 주선자: {proposal.broker_name}
        </p>
        <p className="text-sm text-gray-600">
          지인: {proposal.acq_gender === "M" ? "남" : "여"} / {proposal.acq_birth_year}년생 /{" "}
          {proposal.acq_region} / {proposal.acq_job}
        </p>
        <p className="text-sm text-gray-500">{proposal.acq_intro}</p>
        <p className="text-sm font-semibold mt-2">
          진행 상태: {proposal.status} · 만남 {proposal.meeting_count}/3
        </p>
      </section>

      {msg && <p className="text-sm text-rose-600">{msg}</p>}

      {proposal.warning_ack === 0 ? (
        <button
          onClick={() => setShowWarning(true)}
          className="bg-amber-500 text-white text-sm px-3 py-2 rounded-md self-start"
        >
          만남 시작 전 필독 확인하기
        </button>
      ) : proposal.meeting_count < 3 ? (
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">{proposal.meeting_count + 1}회차 만남 기록</h2>
          <textarea
            className="border rounded-md w-full p-2 text-sm"
            placeholder="만남 후기(선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={submitMeeting}
            className="mt-2 bg-rose-600 text-white text-sm px-3 py-2 rounded-md hover:bg-rose-700"
          >
            만남 완료로 기록 (양측 확인)
          </button>
        </section>
      ) : (
        <p className="text-green-700 font-semibold">3회 만남 완료 — 성사되었습니다.</p>
      )}

      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">만남 이력</h2>
        {meetings.length === 0 && <p className="text-sm text-gray-400">아직 기록된 만남이 없습니다.</p>}
        <ul className="space-y-2">
          {meetings.map((m) => (
            <li key={m.id} className="text-sm border-b pb-2">
              {m.seq}회차 - {m.note || "(후기 없음)"} <span className="text-xs text-gray-400">{m.created_at}</span>
            </li>
          ))}
        </ul>
      </section>

      {showWarning && <WarningModal onClose={() => setShowWarning(false)} onConfirm={ackWarning} />}

      {showReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-red-600 mb-3">무관용 신고 접수</h2>
            <label className="text-sm text-gray-600">
              신고 유형
              <select
                className="border rounded-md px-3 py-2 w-full mt-1"
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
              >
                <option value="money">금전 요구</option>
                <option value="proselytize">포교/종교 권유</option>
                <option value="business">사업/투자 권유</option>
                <option value="violence">폭력/폭언</option>
              </select>
            </label>
            <textarea
              className="border rounded-md w-full p-2 text-sm mt-2"
              placeholder="신고 내용을 구체적으로 적어주세요"
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowReport(false)} className="px-4 py-2 rounded-md border text-sm">
                취소
              </button>
              <button
                onClick={submitReport}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
              >
                신고 접수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
