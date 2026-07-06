"use client";
import { useEffect, useState, useCallback } from "react";
import { useMe } from "@/components/useMe";

interface Acquaintance {
  id: number;
  gender: string;
  birth_year: number;
  region: string;
  job: string;
  consent_status: string;
}

interface Applicant {
  id: number;
  display_name: string;
  gender: string;
  birth_year: number;
  region: string;
  job: string;
}

export default function ProposePage() {
  const { user, loading } = useMe();
  const [acquaintances, setAcquaintances] = useState<Acquaintance[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedAcq, setSelectedAcq] = useState<number | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/acquaintances");
    const data = await res.json();
    const agreed = (data.acquaintances ?? []).filter(
      (a: Acquaintance) => a.consent_status === "agreed"
    );
    setAcquaintances(agreed);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    const acq = acquaintances.find((a) => a.id === selectedAcq);
    if (!acq) {
      setApplicants([]);
      return;
    }
    // 지인이 여성이면 남성 신청자에게, 남성이면 여성 신청자에게 소개
    const targetGender = acq.gender === "F" ? "M" : "F";
    fetch(`/api/applicants?gender=${targetGender}`)
      .then((r) => r.json())
      .then((d) => setApplicants(d.applicants ?? []));
  }, [selectedAcq, acquaintances]);

  async function submit() {
    if (!selectedAcq || !selectedApplicant) {
      setMsg("지인과 신청자를 모두 선택하세요.");
      return;
    }
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acquaintance_id: selectedAcq, applicant_id: selectedApplicant }),
    });
    const data = await res.json();
    setMsg(res.ok ? "소개 제안을 보냈습니다." : data.error);
  }

  if (loading) return <p className="text-gray-400">불러오는 중...</p>;
  if (!user || user.role !== "broker") return <p>주선자만 접근 가능합니다.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-xl font-bold">소개 제안 보내기</h1>
      <p className="text-sm text-gray-500">
        동의 완료된 지인만 소개할 수 있습니다. 동일 지인은 월 3회까지만 소개 가능합니다.
      </p>

      <label className="text-sm text-gray-600">
        지인 선택
        <select
          className="border rounded-md px-3 py-2 w-full mt-1"
          value={selectedAcq ?? ""}
          onChange={(e) => setSelectedAcq(Number(e.target.value) || null)}
        >
          <option value="">선택하세요</option>
          {acquaintances.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id} {a.gender === "M" ? "남" : "여"}/{a.birth_year}/{a.region}/{a.job}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        신청자 선택
        <select
          className="border rounded-md px-3 py-2 w-full mt-1"
          value={selectedApplicant ?? ""}
          onChange={(e) => setSelectedApplicant(Number(e.target.value) || null)}
        >
          <option value="">선택하세요</option>
          {applicants.map((a) => (
            <option key={a.id} value={a.id}>
              {a.display_name} ({a.gender === "M" ? "남" : "여"}/{a.birth_year}/{a.region}/{a.job})
            </option>
          ))}
        </select>
      </label>

      {msg && <p className="text-sm text-rose-600">{msg}</p>}

      <button
        onClick={submit}
        className="bg-rose-600 text-white rounded-md py-2 hover:bg-rose-700 self-start px-4"
      >
        제안 보내기
      </button>
    </div>
  );
}
