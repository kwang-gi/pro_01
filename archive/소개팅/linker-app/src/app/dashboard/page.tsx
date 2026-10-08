"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useMe } from "@/components/useMe";
import WarningModal from "@/components/WarningModal";

interface Proposal {
  id: number;
  status: string;
  meeting_count: number;
  warning_ack: number;
  broker_name: string;
  acq_gender: string;
  acq_birth_year: number;
  acq_region: string;
  acq_job: string;
  acq_intro: string;
}

interface DepositReq {
  id: number;
  kind: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, ledger, loading } = useMe();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositReq[]>([]);
  const [warningTarget, setWarningTarget] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch("/api/proposals").then((r) => r.json()),
      fetch("/api/payments/deposit-request").then((r) => r.json()),
    ]);
    setProposals(pRes.proposals ?? []);
    setDepositRequests(dRes.requests ?? []);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function requestInitialDeposit() {
    const res = await fetch("/api/payments/deposit-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "initial" }),
    });
    const data = await res.json();
    setMsg(res.ok ? "입금 신고가 접수되었습니다. 관리자 확인을 기다려주세요. [모의]" : data.error);
    load();
  }

  async function acceptProposal(id: number) {
    const res = await fetch(`/api/proposals/${id}/accept`, { method: "POST" });
    const data = await res.json();
    setMsg(res.ok ? "제안을 수락했습니다." : data.error);
    load();
  }

  async function declineProposal(id: number) {
    const res = await fetch(`/api/proposals/${id}/decline`, { method: "POST" });
    const data = await res.json();
    setMsg(res.ok ? "제안을 거절했습니다." : data.error);
    load();
  }

  async function ackWarning(id: number) {
    await fetch(`/api/proposals/${id}/ack-warning`, { method: "POST" });
    setWarningTarget(null);
    setMsg("경고 확인 완료. 이제 만남을 기록할 수 있습니다.");
    load();
  }

  if (loading) return <p className="text-gray-400">불러오는 중...</p>;
  if (!user) return <p>로그인이 필요합니다.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">신청자 대시보드</h1>

      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">
          내 잔고 <span className="mock-badge">[모의 입금]</span>
        </h2>
        <p className="text-sm text-gray-600">
          예치금: <b>{ledger?.deposit_balance ?? 0}</b> / 주선비 잔액: <b>{ledger?.fee_balance ?? 0}</b>
        </p>
        {user.verification_status !== "active" && (
          <p className="text-sm text-amber-600 mt-2">
            가입 승인 대기 중입니다. 관리자 승인 후 입금 신고가 가능합니다.
          </p>
        )}
        {user.verification_status === "active" && (ledger?.deposit_balance ?? 0) === 0 && (
          <button
            onClick={requestInitialDeposit}
            className="mt-3 bg-rose-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-rose-700"
          >
            최초 입금(예치금5+주선비1=6) 신고하기
          </button>
        )}
        {depositRequests.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            <p className="font-semibold mb-1">입금 신고 내역</p>
            <ul className="space-y-0.5">
              {depositRequests.map((d) => (
                <li key={d.id}>
                  #{d.id} {d.kind} {d.amount} - {d.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {msg && <p className="text-sm text-rose-600">{msg}</p>}

      <section className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">받은 소개 제안 / 진행 중 만남</h2>
        {proposals.length === 0 && <p className="text-sm text-gray-400">아직 받은 제안이 없습니다.</p>}
        <ul className="flex flex-col gap-3">
          {proposals.map((p) => (
            <li key={p.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    주선자: {p.broker_name} · 상태: <StatusBadge status={p.status} />
                  </p>
                  <p className="text-sm text-gray-600">
                    지인: {p.acq_gender === "M" ? "남" : "여"} / {p.acq_birth_year}년생 / {p.acq_region} /{" "}
                    {p.acq_job}
                  </p>
                  <p className="text-sm text-gray-500">{p.acq_intro}</p>
                  <p className="text-xs text-gray-400 mt-1">만남 진행: {p.meeting_count}/3</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {p.status === "proposed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptProposal(p.id)}
                        className="text-xs bg-rose-600 text-white px-2 py-1 rounded"
                      >
                        수락(주선비1 차감)
                      </button>
                      <button
                        onClick={() => declineProposal(p.id)}
                        className="text-xs border px-2 py-1 rounded"
                      >
                        거절
                      </button>
                    </div>
                  )}
                  {p.status === "accepted" && p.warning_ack === 0 && (
                    <button
                      onClick={() => setWarningTarget(p.id)}
                      className="text-xs bg-amber-500 text-white px-2 py-1 rounded"
                    >
                      만남 시작 전 필독 확인
                    </button>
                  )}
                  {(p.status === "in_progress" || p.status === "matched") && (
                    <Link
                      href={`/meetings/${p.id}`}
                      className="text-xs bg-gray-800 text-white px-2 py-1 rounded"
                    >
                      만남 기록 관리
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {warningTarget && (
        <WarningModal onClose={() => setWarningTarget(null)} onConfirm={() => ackWarning(warningTarget)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    proposed: "제안됨",
    accepted: "수락됨(경고확인 필요)",
    declined: "거절됨",
    in_progress: "만남 진행중",
    matched: "성사됨",
    ended: "종료",
  };
  return <span className="text-xs bg-gray-100 rounded px-2 py-0.5">{map[status] ?? status}</span>;
}
