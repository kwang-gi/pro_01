import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-gray-900">
        지인 소개 기반 매칭, <span className="text-rose-600">만남</span>
      </h1>
      <p className="text-gray-500 max-w-md">
        믿을 수 있는 지인을 통한 소개팅 MVP입니다. 모든 결제/인증/알림 기능은
        데모를 위해 <span className="mock-badge">[모의]</span> 처리되어 있습니다.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="bg-rose-600 text-white px-5 py-2.5 rounded-md hover:bg-rose-700"
        >
          회원가입
        </Link>
        <Link href="/login" className="border px-5 py-2.5 rounded-md hover:bg-gray-50">
          로그인
        </Link>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl w-full text-left">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">신청자(남/여)</h2>
          <p className="text-sm text-gray-500">
            예치금 5 + 주선비 1을 입금[모의]하고, 주선자의 소개를 받아 만남을 진행합니다.
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">주선자</h2>
          <p className="text-sm text-gray-500">
            지인을 등록(성비 룰 적용)하고 동의[모의] 후 신청자에게 소개를 제안합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
