"use client";
import { useEffect, useState } from "react";

interface Notice {
  id: number;
  title: string;
  content: string;
  is_auto: number;
  created_at: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((d) => setNotices(d.notices ?? []));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">공지사항</h1>
      <ul className="flex flex-col gap-3">
        {notices.map((n) => (
          <li key={n.id} className="border rounded-md p-4">
            <p className="font-semibold">
              {n.title}
              {n.is_auto === 1 && <span className="mock-badge ml-1">자동생성</span>}
            </p>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.content}</p>
            <p className="text-xs text-gray-400 mt-2">{n.created_at}</p>
          </li>
        ))}
        {notices.length === 0 && <p className="text-sm text-gray-400">공지사항이 없습니다.</p>}
      </ul>
    </div>
  );
}
