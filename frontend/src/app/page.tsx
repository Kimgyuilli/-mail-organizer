"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface ClassificationInfo {
  classification_id: number;
  category: string;
  confidence: number | null;
  user_feedback: string | null;
}

interface MailMessage {
  id: number;
  external_id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string | null;
  is_read: boolean;
  classification: ClassificationInfo | null;
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
  classification: ClassificationInfo | null;
}

interface UserInfo {
  user_id: number;
  email: string;
  google_connected: boolean;
  naver_connected: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  업무: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  개인: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  금융: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  프로모션: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  뉴스레터: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  알림: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  중요: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const DEFAULT_BADGE = "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";

export default function Home() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedMail, setSelectedMail] = useState<MailDetail | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [applyingLabels, setApplyingLabels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingMailId, setEditingMailId] = useState<number | null>(null);
  const limit = 20;

  // Check for stored user_id
  useEffect(() => {
    const stored = localStorage.getItem("user_id");
    if (stored) {
      setUserId(Number(stored));
    }
  }, []);

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

  // Load user info + categories
  useEffect(() => {
    if (!userId) return;
    apiFetch<UserInfo>(`/auth/me?user_id=${userId}`)
      .then(setUserInfo)
      .catch(() => {
        localStorage.removeItem("user_id");
        setUserId(null);
      });
    apiFetch<{ categories: string[] }>("/api/classify/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, [userId]);

  const loadMessages = useCallback(
    async (newOffset?: number) => {
      if (!userId) return;
      const o = newOffset ?? offset;
      setLoading(true);
      try {
        const data = await apiFetch<MailListResponse>(
          `/api/gmail/messages?user_id=${userId}&offset=${o}&limit=${limit}`
        );
        setMessages(data.messages);
        setTotal(data.total);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, offset]
  );

  // Load messages
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleLogin = async () => {
    const data = await apiFetch<{ auth_url: string }>("/auth/login");
    window.location.href = data.auth_url;
  };

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
      await loadMessages(0);
    } catch (err) {
      alert(`동기화 실패: ${err}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleClassify = async () => {
    if (!userId) return;
    setClassifying(true);
    try {
      const result = await apiFetch<{
        classified: number;
        results: { mail_id: number; category: string }[];
      }>(`/api/classify/mails?user_id=${userId}`, { method: "POST" });
      alert(`${result.classified}개의 메일이 분류되었습니다.`);
      await loadMessages();
    } catch (err) {
      alert(`분류 실패: ${err}`);
    } finally {
      setClassifying(false);
    }
  };

  const handleApplyLabels = async () => {
    if (!userId) return;
    const classifiedMails = messages.filter((m) => m.classification);
    if (classifiedMails.length === 0) {
      alert("분류된 메일이 없습니다. 먼저 AI 분류를 실행하세요.");
      return;
    }
    setApplyingLabels(true);
    try {
      const result = await apiFetch<{ applied: number }>(
        `/api/gmail/apply-labels?user_id=${userId}`,
        {
          method: "POST",
          body: JSON.stringify({
            mail_ids: classifiedMails.map((m) => m.id),
          }),
        }
      );
      alert(`${result.applied}개의 Gmail 라벨이 적용되었습니다.`);
    } catch (err) {
      alert(`라벨 적용 실패: ${err}`);
    } finally {
      setApplyingLabels(false);
    }
  };

  const handleUpdateCategory = async (
    classificationId: number,
    newCategory: string,
    mailId: number
  ) => {
    if (!userId) return;
    try {
      await apiFetch(`/api/classify/update?user_id=${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          classification_id: classificationId,
          new_category: newCategory,
        }),
      });
      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === mailId
            ? {
                ...m,
                classification: m.classification
                  ? {
                      ...m.classification,
                      category: newCategory,
                      user_feedback: newCategory,
                    }
                  : null,
              }
            : m
        )
      );
      if (selectedMail && selectedMail.id === mailId) {
        setSelectedMail((prev) =>
          prev
            ? {
                ...prev,
                classification: prev.classification
                  ? {
                      ...prev.classification,
                      category: newCategory,
                      user_feedback: newCategory,
                    }
                  : null,
              }
            : null
        );
      }
      setEditingMailId(null);
    } catch (err) {
      alert(`수정 실패: ${err}`);
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
    const cls = selectedMail.classification;
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {selectedMail.subject || "(제목 없음)"}
            </h1>
            {cls && (
              <CategoryBadge
                category={cls.category}
                confidence={cls.confidence}
                userFeedback={cls.user_feedback}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
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

          {/* Classification edit in detail */}
          {cls && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                분류:
              </span>
              <CategoryBadge
                category={cls.category}
                confidence={cls.confidence}
                userFeedback={cls.user_feedback}
              />
              <span className="text-sm text-zinc-500">→</span>
              <select
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={cls.category}
                onChange={(e) =>
                  handleUpdateCategory(
                    cls.classification_id,
                    e.target.value,
                    selectedMail.id
                  )
                }
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

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
  const classifiedCount = messages.filter((m) => m.classification).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">
            Mail Organizer
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {userInfo?.email}
            </span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {syncing ? "동기화 중..." : "메일 동기화"}
            </button>
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {classifying ? "분류 중..." : "AI 분류"}
            </button>
            <button
              onClick={handleApplyLabels}
              disabled={applyingLabels || classifiedCount === 0}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {applyingLabels ? "적용 중..." : "Gmail 라벨 적용"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
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
            <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
              <span>총 {total}개의 메일</span>
              <span>
                분류됨: {classifiedCount}/{messages.length}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {messages.map((mail) => (
                <div
                  key={mail.id}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
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
                  {/* Category badge */}
                  <span className="w-20 shrink-0">
                    {mail.classification ? (
                      editingMailId === mail.id ? (
                        <select
                          className="w-full rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          value={mail.classification.category}
                          onChange={(e) => {
                            handleUpdateCategory(
                              mail.classification!.classification_id,
                              e.target.value,
                              mail.id
                            );
                          }}
                          onBlur={() => setEditingMailId(null)}
                          autoFocus
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMailId(mail.id);
                          }}
                          title="클릭하여 분류 수정"
                        >
                          <CategoryBadge
                            category={mail.classification.category}
                            confidence={null}
                            userFeedback={
                              mail.classification.user_feedback
                            }
                            small
                          />
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </span>
                  {/* Clickable mail content */}
                  <button
                    onClick={() => handleSelectMail(mail.id)}
                    className="flex flex-1 items-center gap-4 text-left min-w-0"
                  >
                    {/* Sender */}
                    <span className="w-40 truncate text-sm text-black dark:text-white">
                      {mail.from_name ||
                        mail.from_email ||
                        "(알 수 없음)"}
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
                </div>
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

function CategoryBadge({
  category,
  confidence,
  userFeedback,
  small,
}: {
  category: string;
  confidence: number | null;
  userFeedback: string | null;
  small?: boolean;
}) {
  const colors = CATEGORY_COLORS[category] || DEFAULT_BADGE;
  const sizeClass = small ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors} ${sizeClass}`}
    >
      {userFeedback && (
        <span title="수동 수정됨" className="opacity-60">
          *
        </span>
      )}
      {category}
      {confidence !== null && !small && (
        <span className="opacity-60">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
