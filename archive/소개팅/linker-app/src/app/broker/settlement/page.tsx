"use client";
import { useEffect, useState, useCallback } from "react";
import { useMe } from "@/components/useMe";

interface Settlement {
  id: number;
  proposal_id: number;
  total_fee: number;
  broker_rate: number;
  broker_amount: number;
  status: string;
  created_at: string;
}

interface BrokerStat {
  totalProposals: number;
  matchedCount: number;
  rate: number;
}

export default function BrokerSettlementPage() {
  const { user, loading } = useMe();
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/settlements");
    const data = await res.json();
    setSettlements(data.settlements ?? []);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading) return <p className="text-gray-400">불러오는 중...</p>;
  if (!user || user.role !== "broker") return <p>주선자만 접근 가능합니다.</p>;

  const totalPending = settlements
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.broker_amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">내 정산 현황</h1>
      <p className="text-sm text-gray-600">정산 대기 합계: {totalPending}</p>

      <ul className="flex flex-col gap-2">
        {settlements.length === 0 && <p className="text-sm text-gray-400">정산 내역이 없습니다.</p>}
        {settlements.map((s) => (
          <li key={s.id} className="border rounded-md p-3 flex justify-between text-sm">
            <span>
              제안 #{s.proposal_id} · 총성사비 {s.total_fee} · 분배율 {Math.round(s.broker_rate * 100)}% ·
              내 몫 {s.broker_amount}
            </span>
            <span className={s.status === "paid" ? "text-green-600" : "text-amber-600"}>
              {s.status === "paid" ? "지급완료" : "정산대기"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
