"use client";

// 만남 확정 직전 금지조항 경고 팝업. matching 모듈 rules.ts 의 텍스트를 클라이언트에서도 그대로 사용.
const PROHIBITED = [
  "돈을 요구하거나 빌려달라고 하면 안 됩니다.",
  "종교를 권유하면 안 됩니다.",
  "사업/투자를 권유하면 안 됩니다.",
  "폭언, 폭력적 언행을 하면 안 됩니다.",
];

export default function WarningModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-rose-600 mb-2">잠깐! 확인해주세요</h2>
        <p className="text-sm font-semibold text-gray-800 mb-3">
          돈·종교·사업·폭언 한마디면 예치금 전액이 몰수됩니다.
        </p>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-3">
          {PROHIBITED.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="text-sm text-gray-500 italic mb-5">
          여기 아이유/박보검 안 나옵니다. 서로 예의를 지키세요.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm hover:bg-rose-700"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
