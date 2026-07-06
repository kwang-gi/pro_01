"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "male_applicant", label: "신청자(남) - 등기인증[모의]" },
  { value: "female_applicant", label: "신청자(여) - 문자인증[모의]" },
  { value: "broker", label: "주선자 - 등기인증[모의]" },
];

export default function SignupPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "male_applicant",
    display_name: "",
    gender: "M",
    birth_year: "",
    region: "",
    job: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({
      ...f,
      [key]: value,
      // 역할 변경 시 성별 자동 매칭 (여성 신청자는 F, 남성 신청자는 M, 주선자는 자유선택 유지)
      ...(key === "role" && value === "female_applicant" ? { gender: "F" } : {}),
      ...(key === "role" && value === "male_applicant" ? { gender: "M" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, birth_year: form.birth_year ? Number(form.birth_year) : null }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "가입 실패");
      return;
    }
    setMessage(data.message);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-xl font-bold mb-6">회원가입</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-gray-600">
          역할
          <select
            className="border rounded-md px-3 py-2 w-full mt-1"
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {form.role === "broker" && (
          <label className="text-sm text-gray-600">
            성별 (남자 주선자는 여자 지인만 등록 가능)
            <select
              className="border rounded-md px-3 py-2 w-full mt-1"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </label>
        )}

        <input
          className="border rounded-md px-3 py-2"
          placeholder="아이디"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="비밀번호"
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="이름(표시명)"
          value={form.display_name}
          onChange={(e) => update("display_name", e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="출생연도 (예: 1993)"
          value={form.birth_year}
          onChange={(e) => update("birth_year", e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="지역"
          value={form.region}
          onChange={(e) => update("region", e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="직업"
          value={form.job}
          onChange={(e) => update("job", e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          disabled={loading}
          className="bg-rose-600 text-white rounded-md py-2 hover:bg-rose-700 disabled:opacity-50"
        >
          {loading ? "처리 중..." : "가입하기"}
        </button>
      </form>
    </div>
  );
}
