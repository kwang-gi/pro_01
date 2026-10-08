"use client";
import { useEffect, useState, useCallback } from "react";
import { useMe } from "@/components/useMe";

interface Acquaintance {
  id: number;
  gender: string;
  birth_year: number;
  region: string;
  job: string;
  intro: string;
  consent_status: string;
}

export default function BrokerAcquaintancesPage() {
  const { user, loading } = useMe();
  const [list, setList] = useState<Acquaintance[]>([]);
  const [form, setForm] = useState({ gender: "F", birth_year: "", region: "", job: "", intro: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/acquaintances");
    const data = await res.json();
    setList(data.acquaintances ?? []);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/acquaintances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, birth_year: Number(form.birth_year) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error);
      return;
    }
    setMsg("지인이 등록되었습니다. 동의 요청 알림이 발송되었습니다. [모의]");
    setForm({ gender: "F", birth_year: "", region: "", job: "", intro: "" });
    load();
  }

  async function respondConsent(id: number, agreed: boolean) {
    await fetch(`/api/acquaintances/${id}/consent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreed }),
    });
    load();
  }

  if (loading) return <p className="text-gray-400">불러오는 중...</p>;
  if (!user || user.role !== "broker") return <p>주선자만 접근 가능합니다.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">지인 등록/목록</h1>
      {user.gender === "M" && (
        <p className="text-sm text-amber-600">
          남자 주선자는 여자 지인만 등록할 수 있습니다 (성비 룰).
        </p>
      )}

      <form onSubmit={submit} className="border rounded-lg p-4 flex flex-col gap-2 max-w-md">
        <h2 className="font-semibold">
          지인 등록 <span className="mock-badge">[모의 알림]</span>
        </h2>
        <label className="text-sm text-gray-600">
          성별
          <select
            className="border rounded-md px-3 py-2 w-full mt-1"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            disabled={user.gender === "M"}
          >
            <option value="F">여</option>
            {user.gender === "F" && <option value="M">남</option>}
          </select>
        </label>
        <input
          className="border rounded-md px-3 py-2"
          placeholder="출생연도"
          value={form.birth_year}
          onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="지역"
          value={form.region}
          onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="직업"
          value={form.job}
          onChange={(e) => setForm((f) => ({ ...f, job: e.target.value }))}
        />
        <textarea
          className="border rounded-md px-3 py-2"
          placeholder="소개글"
          value={form.intro}
          onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
        />
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
        <button className="bg-rose-600 text-white rounded-md py-2 hover:bg-rose-700">등록하기</button>
      </form>

      <section>
        <h2 className="font-semibold mb-3">내 지인 목록</h2>
        <ul className="flex flex-col gap-3">
          {list.map((a) => (
            <li key={a.id} className="border rounded-md p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {a.gender === "M" ? "남" : "여"} / {a.birth_year}년생 / {a.region} / {a.job}
                </p>
                <p className="text-sm text-gray-500">{a.intro}</p>
                <p className="text-xs mt-1">
                  동의 상태:{" "}
                  <span
                    className={
                      a.consent_status === "agreed"
                        ? "text-green-600"
                        : a.consent_status === "declined"
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {a.consent_status}
                  </span>
                </p>
              </div>
              {a.consent_status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => respondConsent(a.id, true)}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                  >
                    동의됨으로 처리 [모의]
                  </button>
                  <button
                    onClick={() => respondConsent(a.id, false)}
                    className="text-xs border px-2 py-1 rounded"
                  >
                    거절 처리
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
