"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "./useMe";

const ROLE_LABEL: Record<string, string> = {
  male_applicant: "신청자(남)",
  female_applicant: "신청자(여)",
  broker: "주선자",
  admin: "관리자",
};

export default function NavBar() {
  const { user, loading } = useMe();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-rose-600">
          만남 <span className="text-xs text-gray-400 font-normal">(가칭 Linker)</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/notices" className="text-gray-600 hover:text-gray-900">
            공지사항
          </Link>
          {!loading && !user && (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                로그인
              </Link>
              <Link
                href="/signup"
                className="bg-rose-600 text-white px-3 py-1.5 rounded-md hover:bg-rose-700"
              >
                회원가입
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              {(user.role === "male_applicant" || user.role === "female_applicant") && (
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  대시보드
                </Link>
              )}
              {user.role === "broker" && (
                <>
                  <Link href="/broker/acquaintances" className="text-gray-600 hover:text-gray-900">
                    지인 관리
                  </Link>
                  <Link href="/broker/propose" className="text-gray-600 hover:text-gray-900">
                    제안 보내기
                  </Link>
                  <Link href="/broker/settlement" className="text-gray-600 hover:text-gray-900">
                    정산 현황
                  </Link>
                </>
              )}
              {user.role === "admin" && (
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                  관리자
                </Link>
              )}
              <span className="text-gray-400">
                {user.display_name} · {ROLE_LABEL[user.role]}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-900 border rounded-md px-3 py-1.5"
              >
                로그아웃
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
