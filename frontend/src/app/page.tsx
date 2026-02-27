"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface MailMessage {
  id: number;
  external_id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string | null;
  is_read: boolean;
}

interface MailListResponse {
  total: number;
  offset: number;
  limit: number;
  messages: MailMessage[];
}

interface MailDetail {
  id: number;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string | null;
  is_read: boolean;
}

interface UserInfo {
  user_id: number;
  email: string;
  google_connected: boolean;
  naver_connected: boolean;
}

export default function Home() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedMail, setSelectedMail] = useState<MailDetail | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  // Check for stored user_id
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) {
      setUserId(Number(stored));
    }
  }, []);

  // Load user info
  useEffect(() => {
    if (!userId) return;
    apiFetch<UserInfo>(`/auth/me?user_id=${userId}`)
      .then(setUserInfo)
      .catch(() => {
        localStorage.removeItem("user_id");
        setUserId(null);
      });
  }, [userId]);

  // Load messages
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiFetch<MailListResponse>(
      `/api/gmail/messages?user_id=${userId}&offset=${offset}&limit=${limit}`
    )
      .then((data) => {
        setMessages(data.messages);
        setTotal(data.total);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [userId, offset]);

  const handleLogin = async () => {
    const data = await apiFetch<{ auth_url: string }>("/auth/login");
    window.location.href = data.auth_url;
  };

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("user_id");
    if (uid) {
      localStorage.setItem("user_id", uid);
      setUserId(Number(uid));
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleSync = async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const result = await apiFetch<{ synced: number }>(
        `/api/gmail/sync?user_id=${userId}&max_results=50`,
        { method: "POST" }
      );
      alert(`${result.synced}개의 새 메일을 동기화했습니다.`);
      setOffset(0);
      // Reload messages
      const data = await apiFetch<MailListResponse>(
        `/api/gmail/messages?user_id=${userId}&offset=0&limit=${limit}`
      );
      setMessages(data.messages);
      setTotal(data.total);
    } catch (err) {
      alert(`동기화 실패: ${err}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectMail = async (mailId: number) => {
    if (!userId) return;
    try {
      const detail = await apiFetch<MailDetail>(
        `/api/gmail/messages/${mailId}?user_id=${userId}`
      );
      setSelectedMail(detail);
    } catch {
      alert("메일을 불러올 수 없습니다.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    setUserId(null);
    setUserInfo(null);
    setMessages([]);
    setSelectedMail(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  // Not logged in
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <main className="flex flex-col items-center gap-8 py-32 px-16">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            Mail Organizer
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Gmail + 네이버 메일 통합 관리 플랫폼
          </p>
          <button
            onClick={handleLogin}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Google 계정으로 로그인
          </button>
        </main>
      </div>
    );
  }

  // Mail detail view
  if (selectedMail) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={() => setSelectedMail(null)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            &larr; 목록으로
          </button>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-4">
            {selectedMail.subject || "(제목 없음)"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            <span className="font-medium">
              {selectedMail.from_name || selectedMail.from_email}
            </span>
            {selectedMail.from_name && (
              <span>&lt;{selectedMail.from_email}&gt;</span>
            )}
            <span className="ml-auto">
              {selectedMail.received_at
                ? new Date(selectedMail.received_at).toLocaleString("ko-KR")
                : ""}
            </span>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <pre className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed">
              {selectedMail.body_text || "(본문 없음)"}
            </pre>
          </div>
        </main>
      </div>
    );
  }

  // Mail list view
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">
            Mail Organizer
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {userInfo?.email}
            </span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {syncing ? "동기화 중..." : "메일 동기화"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Mail List */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="text-zinc-500">로딩 중...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-zinc-500">메일이 없습니다.</p>
            <p className="text-sm text-zinc-400">
              &quot;메일 동기화&quot; 버튼을 눌러 Gmail에서 메일을
              가져오세요.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-zinc-500">
              총 {total}개의 메일
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {messages.map((mail) => (
                <button
                  key={mail.id}
                  onClick={() => handleSelectMail(mail.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                    !mail.is_read
                      ? "font-semibold"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {/* Unread indicator */}
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      !mail.is_read ? "bg-blue-500" : "bg-transparent"
                    }`}
                  />
                  {/* Sender */}
                  <span className="w-48 truncate text-sm text-black dark:text-white">
                    {mail.from_name || mail.from_email || "(알 수 없음)"}
                  </span>
                  {/* Subject */}
                  <span className="flex-1 truncate text-sm text-black dark:text-white">
                    {mail.subject || "(제목 없음)"}
                  </span>
                  {/* Date */}
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatDate(mail.received_at)}
                  </span>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-30 dark:border-zinc-700"
                >
                  이전
                </button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={currentPage >= totalPages}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-30 dark:border-zinc-700"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
