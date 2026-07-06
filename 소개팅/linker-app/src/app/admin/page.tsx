"use client";
import { useEffect, useState, useCallback } from "react";
import { useMe } from "@/components/useMe";

type Tab = "users" | "payments" | "reports" | "notices" | "brokers" | "settlements";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  display_name: string;
  gender: string;
  verification_status: string;
  verification_method: string | null;
  deposit_balance: number;
  fee_balance: number;
}

interface DepositReq {
  id: number;
  user_id: number;
  user_name: string;
  kind: string;
  amount: number;
  status: string;
  memo: string;
}

interface Report {
  id: number;
  reporter_name: string;
  accused_name: string;
  category: string;
  content: string;
  status: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  is_auto: number;
}

interface Broker {
  id: number;
  display_name: string;
  gender: string;
  totalProposals: number;
  matchedCount: number;
  rate: number;
}

interface Settlement {
  id: number;
  proposal_id: number;
  broker_id: number;
  total_fee: number;
  broker_amount: number;
  status: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "users", label: "가입/유저 관리" },
  { key: "payments", label: "입금 확인" },
  { key: "reports", label: "신고/몰수 처리" },
  { key: "notices", label: "공지 관리" },
  { key: "brokers", label: "주선자 성사율" },
  { key: "settlements", label: "정산 처리" },
];

const CATEGORY_LABEL: Record<string, string> = {
  violence: "폭력/폭언",
  proselytize: "포교/종교",
  business: "사업/투자",
  money: "금전요구",
};

export default function AdminPage() {
  const { user, loading } = useMe();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<DepositReq[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [u, p, r, n, b, s] = await Promise.all([
      fetch("/api/admin/users").then((res) => res.json()),
      fetch("/api/admin/payments").then((res) => res.json()),
      fetch("/api/admin/reports").then((res) => res.json()),
      fetch("/api/notices").then((res) => res.json()),
      fetch("/api/admin/brokers").then((res) => res.json()),
      fetch("/api/admin/settlements").then((res) => res.json()),
    ]);
    setUsers(u.users ?? []);
    setPayments(p.requests ?? []);
    setReports(r.reports ?? []);
    setNotices(n.notices ?? []);
    setBrokers(b.brokers ?? []);
    setSettlements(s.settlements ?? []);
  }, []);

  useEffect(() => {
    if (user?.role === "admin") loadAll();
  }, [user, loadAll]);

  async function approveUser(id: number) {
    await fetch(`/api/admin/users/${id}/approve`, { method: "POST" });
    loadAll();
  }
  async function rejectUser(id: number) {
    await fetch(`/api/admin/users/${id}/reject`, { method: "POST" });
    loadAll();
  }
  async function confirmPayment(id: number) {
    const res = await fetch(`/api/admin/payments/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    setMsg(res.ok ? "입금 확인 완료 - 잔고 반영됨" : data.error);
    loadAll();
  }
  async function rejectPayment(id: number) {
    await fetch(`/api/admin/payments/${id}/reject`, { method: "POST" });
    loadAll();
  }
  async function confirmReport(id: number) {
    const res = await fetch(`/api/admin/reports/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    setMsg(res.ok ? "신고 확정 - 몰수/공지/환불 처리 완료" : data.error);
    loadAll();
  }
  async function dismissReport(id: number) {
    await fetch(`/api/admin/reports/${id}/dismiss`, { method: "POST" });
    loadAll();
  }
  async function createNotice(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noticeForm),
    });
    setNoticeForm({ title: "", content: "" });
    loadAll();
  }
  async function paySettlement(id: number) {
    await fetch(`/api/admin/settlements/${id}/pay`, { method: "POST" });
    loadAll();
  }

  if (loading) return <p className="text-gray-400">불러오는 중...</p>;
  if (!user || user.role !== "admin") return <p>관리자만 접근 가능합니다.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">관리자 콘솔</h1>
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-3 py-1.5 rounded-md ${
              tab === t.key ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-rose-600">{msg}</p>}

      {tab === "users" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">이름</th>
              <th>역할</th>
              <th>인증방식</th>
              <th>가입상태</th>
              <th>예치금/주선비</th>
              <th>조치</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.display_name} ({u.username})</td>
                <td>{u.role}</td>
                <td>{u.verification_method ?? "-"}</td>
                <td>
                  <span
                    className={
                      u.verification_status === "active"
                        ? "text-green-600"
                        : u.verification_status === "rejected"
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {u.verification_status}
                  </span>
                </td>
                <td>
                  {u.deposit_balance ?? 0} / {u.fee_balance ?? 0}
                </td>
                <td>
                  {u.verification_status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => approveUser(u.id)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                      >
                        승인[모의 등기확인]
                      </button>
                      <button
                        onClick={() => rejectUser(u.id)}
                        className="text-xs border px-2 py-1 rounded"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "payments" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">유저</th>
              <th>종류</th>
              <th>금액</th>
              <th>상태</th>
              <th>메모</th>
              <th>조치</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.user_name}</td>
                <td>{p.kind}</td>
                <td>{p.amount}</td>
                <td>{p.status}</td>
                <td className="text-xs text-gray-500">{p.memo}</td>
                <td>
                  {p.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => confirmPayment(p.id)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                      >
                        입금확인
                      </button>
                      <button
                        onClick={() => rejectPayment(p.id)}
                        className="text-xs border px-2 py-1 rounded"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "reports" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">신고자</th>
              <th>피신고자</th>
              <th>유형</th>
              <th>내용</th>
              <th>상태</th>
              <th>조치</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b align-top">
                <td className="py-2">{r.reporter_name}</td>
                <td>{r.accused_name}</td>
                <td>{CATEGORY_LABEL[r.category] ?? r.category}</td>
                <td className="max-w-xs">{r.content}</td>
                <td>{r.status}</td>
                <td>
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => confirmReport(r.id)}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                      >
                        확정(몰수)
                      </button>
                      <button
                        onClick={() => dismissReport(r.id)}
                        className="text-xs border px-2 py-1 rounded"
                      >
                        기각
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "notices" && (
        <div className="flex flex-col gap-4">
          <form onSubmit={createNotice} className="border rounded-md p-3 flex flex-col gap-2 max-w-md">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="제목"
              value={noticeForm.title}
              onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="border rounded-md px-3 py-2"
              placeholder="내용"
              value={noticeForm.content}
              onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
            />
            <button className="bg-rose-600 text-white rounded-md py-2">공지 등록</button>
          </form>
          <ul className="flex flex-col gap-2">
            {notices.map((n) => (
              <li key={n.id} className="border rounded-md p-3 text-sm">
                <b>{n.title}</b> {n.is_auto === 1 && <span className="mock-badge">자동</span>}
                <p className="text-gray-600 mt-1">{n.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "brokers" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">주선자</th>
              <th>제안수</th>
              <th>성사수</th>
              <th>성사율</th>
            </tr>
          </thead>
          <tbody>
            {brokers.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">
                  {b.display_name} ({b.gender === "M" ? "남" : "여"})
                </td>
                <td>{b.totalProposals}</td>
                <td>{b.matchedCount}</td>
                <td>{b.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "settlements" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">제안</th>
              <th>총성사비</th>
              <th>주선자몫</th>
              <th>상태</th>
              <th>조치</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2">#{s.proposal_id}</td>
                <td>{s.total_fee}</td>
                <td>{s.broker_amount}</td>
                <td>{s.status}</td>
                <td>
                  {s.status === "pending" && (
                    <button
                      onClick={() => paySettlement(s.id)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                    >
                      지급완료 처리
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
