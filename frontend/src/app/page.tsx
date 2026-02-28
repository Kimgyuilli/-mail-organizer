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
  source: "gmail" | "naver";
  external_id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  to_email: string | null;
  folder: string | null;
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
  source: "gmail" | "naver";
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  to_email: string | null;
  folder: string | null;
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

interface CategoryCount {
  name: string;
  count: number;
  color: string | null;
}

interface CategoryCountsResponse {
  total: number;
  unclassified: number;
  categories: CategoryCount[];
}

interface FeedbackStats {
  total_feedbacks: number;
  sender_rules: { from_email: string; category: string; count: number }[];
  recent_feedbacks: { subject: string; original: string; corrected: string; date: string }[];
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

const CATEGORY_DOT_COLORS: Record<string, string> = {
  업무: "bg-blue-500",
  개인: "bg-green-500",
  금융: "bg-yellow-500",
  프로모션: "bg-orange-500",
  뉴스레터: "bg-purple-500",
  알림: "bg-gray-500",
  중요: "bg-red-500",
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
  const [sourceFilter, setSourceFilter] = useState<"all" | "gmail" | "naver">("all");
  const [showNaverConnect, setShowNaverConnect] = useState(false);
  const [naverEmail, setNaverEmail] = useState("");
  const [naverPassword, setNaverPassword] = useState("");
  const [connectingNaver, setConnectingNaver] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCountsResponse | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [showSenderRules, setShowSenderRules] = useState(false);
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

  // Load category counts
  const loadCategoryCounts = useCallback(async () => {
    if (!userId) return;
    try {
      const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
      const data = await apiFetch<CategoryCountsResponse>(
        `/api/inbox/category-counts?user_id=${userId}${sourceParam}`
      );
      setCategoryCounts(data);
    } catch {
      setCategoryCounts(null);
    }
  }, [userId, sourceFilter]);

  useEffect(() => {
    loadCategoryCounts();
  }, [loadCategoryCounts]);

  // Load feedback stats
  const loadFeedbackStats = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiFetch<FeedbackStats>(
        `/api/classify/feedback-stats?user_id=${userId}`
      );
      setFeedbackStats(data);
    } catch {
      setFeedbackStats(null);
    }
  }, [userId]);

  useEffect(() => {
    loadFeedbackStats();
  }, [loadFeedbackStats]);

  const loadMessages = useCallback(
    async (newOffset?: number) => {
      if (!userId) return;
      const o = newOffset ?? offset;
      setLoading(true);
      try {
        const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
        const categoryParam = categoryFilter ? `&category=${categoryFilter}` : "";
        const data = await apiFetch<MailListResponse>(
          `/api/inbox/messages?user_id=${userId}&offset=${o}&limit=${limit}${sourceParam}${categoryParam}`
        );
        setMessages(data.messages);
        setTotal(data.total);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, offset, sourceFilter, categoryFilter]
  );

  // Load messages when dependencies change
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleLogin = async () => {
    const data = await apiFetch<{ auth_url: string }>("/auth/login");
    window.location.href = data.auth_url;
  };

  const handleSync = async () => {
    if (!userId || !userInfo) return;
    setSyncing(true);
    try {
      const promises = [];

      // Sync Gmail if connected
      if (userInfo.google_connected) {
        promises.push(
          apiFetch<{ synced: number }>(
            `/api/gmail/sync?user_id=${userId}&max_results=50`,
            { method: "POST" }
          )
        );
      }

      // Sync Naver if connected
      if (userInfo.naver_connected) {
        promises.push(
          apiFetch<{ synced: number }>(
            `/api/naver/sync?user_id=${userId}&max_results=50`,
            { method: "POST" }
          )
        );
      }

      const results = await Promise.all(promises);
      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);

      alert(`${totalSynced}개의 새 메일을 동기화했습니다.`);
      setOffset(0);
      await loadMessages(0);
      await loadCategoryCounts();
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
      const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
      const result = await apiFetch<{
        classified: number;
        results: { mail_id: number; category: string }[];
      }>(`/api/classify/mails?user_id=${userId}${sourceParam}`, { method: "POST" });
      alert(`${result.classified}개의 메일이 분류되었습니다.`);
      await loadMessages();
      await loadCategoryCounts();
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
      await loadCategoryCounts();
      await loadFeedbackStats();
    } catch (err) {
      alert(`수정 실패: ${err}`);
    }
  };

  const handleSelectMail = async (mail: MailMessage) => {
    if (!userId) return;
    try {
      const endpoint = mail.source === "gmail"
        ? `/api/gmail/messages/${mail.id}?user_id=${userId}`
        : `/api/naver/messages/${mail.id}?user_id=${userId}`;
      const detail = await apiFetch<MailDetail>(endpoint);
      setSelectedMail(detail);
    } catch {
      alert("메일을 불러올 수 없습니다.");
    }
  };

  const handleConnectNaver = async () => {
    if (!userId || !naverEmail || !naverPassword) return;
    setConnectingNaver(true);
    try {
      await apiFetch(`/api/naver/connect?user_id=${userId}`, {
        method: "POST",
        body: JSON.stringify({
          naver_email: naverEmail,
          naver_app_password: naverPassword,
        }),
      });
      alert("네이버 메일이 연결되었습니다.");
      setShowNaverConnect(false);
      setNaverEmail("");
      setNaverPassword("");
      // Refresh user info
      const updatedInfo = await apiFetch<UserInfo>(`/auth/me?user_id=${userId}`);
      setUserInfo(updatedInfo);
      await loadCategoryCounts();
    } catch (err) {
      alert(`네이버 연결 실패: ${err}`);
    } finally {
      setConnectingNaver(false);
    }
  };

  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    const mailId = Number(e.dataTransfer.getData("mailId"));
    const classificationId = e.dataTransfer.getData("classificationId");

    if (!mailId) return;

    try {
      if (classificationId) {
        // Existing classification - update category
        await handleUpdateCategory(Number(classificationId), targetCategory, mailId);
      } else {
        // Unclassified mail - first classify via AI, then override to target category
        await apiFetch(`/api/classify/mails?user_id=${userId}&mail_ids=${mailId}`, {
          method: "POST",
        });
        // Reload to get the new classification_id
        const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
        const categoryParam = categoryFilter ? `&category=${categoryFilter}` : "";
        const data = await apiFetch<MailListResponse>(
          `/api/inbox/messages?user_id=${userId}&offset=${offset}&limit=${limit}${sourceParam}${categoryParam}`
        );
        const updatedMail = data.messages.find((m) => m.id === mailId);
        if (updatedMail?.classification) {
          // Override AI result with user's intended category
          await handleUpdateCategory(
            updatedMail.classification.classification_id,
            targetCategory,
            mailId
          );
        }
        setMessages(data.messages);
        setTotal(data.total);
      }
      await loadCategoryCounts();
    } catch (err) {
      alert(`분류 실패: ${err}`);
      await loadMessages();
      await loadCategoryCounts();
    }
  };

  const handleCategoryFilter = (cat: string | null) => {
    setCategoryFilter(cat);
    setOffset(0);
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge source={selectedMail.source} />
                {selectedMail.folder && selectedMail.source === "naver" && (
                  <span className="text-xs text-zinc-500">
                    {selectedMail.folder}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {selectedMail.subject || "(제목 없음)"}
              </h1>
            </div>
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
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-black dark:text-white">
              Mail Organizer
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {userInfo?.email}
              </span>
              {userInfo && !userInfo.naver_connected && (
                <button
                  onClick={() => setShowNaverConnect(true)}
                  className="rounded-md border border-green-600 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                >
                  네이버 메일 연결
                </button>
              )}
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
              {sourceFilter === "gmail" && (
                <button
                  onClick={handleApplyLabels}
                  disabled={applyingLabels || classifiedCount === 0}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {applyingLabels ? "적용 중..." : "Gmail 라벨 적용"}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* Source Filter Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                setSourceFilter("all");
                setOffset(0);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                sourceFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => {
                setSourceFilter("gmail");
                setOffset(0);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                sourceFilter === "gmail"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              Gmail
            </button>
            <button
              onClick={() => {
                setSourceFilter("naver");
                setOffset(0);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                sourceFilter === "naver"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              네이버
            </button>
          </div>
        </div>
      </header>

      {/* Naver Connect Modal */}
      {showNaverConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
              네이버 메일 연결
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                  네이버 이메일
                </label>
                <input
                  type="email"
                  value={naverEmail}
                  onChange={(e) => setNaverEmail(e.target.value)}
                  placeholder="example@naver.com"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black dark:text-white">
                  앱 비밀번호
                </label>
                <input
                  type="password"
                  value={naverPassword}
                  onChange={(e) => setNaverPassword(e.target.value)}
                  placeholder="네이버 앱 비밀번호"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  네이버 메일 설정에서 IMAP 사용 설정 후 앱 비밀번호를 생성하세요.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowNaverConnect(false);
                    setNaverEmail("");
                    setNaverPassword("");
                  }}
                  className="px-4 py-2 border border-zinc-300 rounded-md text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
                <button
                  onClick={handleConnectNaver}
                  disabled={connectingNaver || !naverEmail || !naverPassword}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {connectingNaver ? "연결 중..." : "연결"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mail List with Sidebar */}
      <div className="mx-auto max-w-6xl px-6 py-6 flex gap-6">
        {/* Category Sidebar */}
        <aside className="w-56 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            카테고리
          </h2>
          <nav className="space-y-1">
            {/* All */}
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                categoryFilter === null
                  ? "bg-zinc-100 dark:bg-zinc-800 font-medium text-black dark:text-white"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span>전체</span>
              <span className="text-xs text-zinc-400">
                {categoryCounts?.total || 0}
              </span>
            </button>

            {/* Categories - drop targets */}
            {categoryCounts?.categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryFilter(cat.name)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCategory(cat.name);
                }}
                onDragLeave={() => {
                  setDragOverCategory(null);
                }}
                onDrop={(e) => {
                  handleDrop(e, cat.name);
                  setDragOverCategory(null);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  dragOverCategory === cat.name
                    ? "ring-2 ring-blue-400"
                    : ""
                } ${
                  categoryFilter === cat.name
                    ? "bg-zinc-100 dark:bg-zinc-800 font-medium text-black dark:text-white"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      CATEGORY_DOT_COLORS[cat.name] || "bg-zinc-400"
                    }`}
                  />
                  {cat.name}
                </span>
                <span className="text-xs text-zinc-400">{cat.count}</span>
              </button>
            ))}

            {/* Unclassified */}
            <button
              onClick={() => handleCategoryFilter("unclassified")}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                categoryFilter === "unclassified"
                  ? "bg-zinc-100 dark:bg-zinc-800 font-medium text-black dark:text-white"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span>미분류</span>
              <span className="text-xs text-zinc-400">
                {categoryCounts?.unclassified || 0}
              </span>
            </button>
          </nav>

          {/* Feedback Stats Section */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              학습 현황
            </h2>

            {feedbackStats && feedbackStats.total_feedbacks > 0 ? (
              <div className="space-y-3">
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">피드백</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {feedbackStats.total_feedbacks}건
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400">발신자 규칙</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {feedbackStats.sender_rules.length}건
                    </span>
                  </div>
                </div>

                {feedbackStats.sender_rules.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowSenderRules(!showSenderRules)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                      <span>발신자 규칙 상세</span>
                      <span className="text-zinc-400">
                        {showSenderRules ? "▲" : "▼"}
                      </span>
                    </button>

                    {showSenderRules && (
                      <div className="mt-2 space-y-1.5 px-2">
                        {feedbackStats.sender_rules.slice(0, 5).map((rule) => (
                          <div
                            key={rule.from_email}
                            className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"
                          >
                            <div className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                              {rule.from_email}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span>→</span>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${
                                  CATEGORY_COLORS[rule.category] || DEFAULT_BADGE
                                }`}
                              >
                                {rule.category}
                              </span>
                              <span className="text-zinc-400">({rule.count}건)</span>
                            </div>
                          </div>
                        ))}
                        {feedbackStats.sender_rules.length > 5 && (
                          <div className="text-xs text-zinc-400 text-center pt-1">
                            외 {feedbackStats.sender_rules.length - 5}건
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-4 text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
                분류를 수정하면 AI가 학습합니다
              </div>
            )}
          </div>
        </aside>

        {/* Mail List */}
        <main className="flex-1 min-w-0">
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
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("mailId", String(mail.id));
                    e.dataTransfer.setData(
                      "classificationId",
                      mail.classification
                        ? String(mail.classification.classification_id)
                        : ""
                    );
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-grab active:cursor-grabbing ${
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
                  {/* Source badge */}
                  <span className="shrink-0">
                    <SourceBadge source={mail.source} small />
                  </span>
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
                    onClick={() => handleSelectMail(mail)}
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

function SourceBadge({
  source,
  small,
}: {
  source: "gmail" | "naver";
  small?: boolean;
}) {
  const isGmail = source === "gmail";
  const bgColor = isGmail
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200";
  const sizeClass = small
    ? "w-5 h-5 text-xs"
    : "w-6 h-6 text-sm";
  const label = isGmail ? "G" : "N";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ${bgColor} ${sizeClass}`}
      title={isGmail ? "Gmail" : "네이버"}
    >
      {label}
    </span>
  );
}
