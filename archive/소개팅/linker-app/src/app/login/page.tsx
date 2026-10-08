"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "로그인 실패");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-bold mb-6">로그인</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="border rounded-md px-3 py-2"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="border rounded-md px-3 py-2"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="bg-rose-600 text-white rounded-md py-2 hover:bg-rose-700 disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        계정이 없으신가요? <Link href="/signup" className="text-rose-600">회원가입</Link>
      </p>

      <div className="mt-8 border rounded-md p-3 text-xs text-gray-500 bg-gray-50">
        <p className="font-semibold mb-1">시드 계정 (테스트용)</p>
        <ul className="space-y-0.5">
          <li>관리자: admin / admin123</li>
          <li>주선자(남): broker_m / 1234</li>
          <li>주선자(여): broker_f / 1234</li>
          <li>신청자(남1, 활성): male1 / 1234</li>
          <li>신청자(남2, 승인대기): male2 / 1234</li>
          <li>신청자(여1): female1 / 1234</li>
          <li>신청자(여2): female2 / 1234</li>
        </ul>
      </div>
    </div>
  );
}
