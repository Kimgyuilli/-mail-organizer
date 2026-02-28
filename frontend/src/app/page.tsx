"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useCategoryCounts } from "@/hooks/useCategoryCounts";
import { useFeedbackStats } from "@/hooks/useFeedbackStats";
import { useMailActions } from "@/hooks/useMailActions";
import { useNaverConnect } from "@/hooks/useNaverConnect";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { LoginScreen } from "@/components/LoginScreen";
import { MailDetailView } from "@/components/MailDetailView";
import { AppHeader } from "@/components/AppHeader";
import { NaverConnectModal } from "@/components/NaverConnectModal";
import { CategorySidebar } from "@/components/CategorySidebar";
import { MailListItem } from "@/components/MailListItem";
import { Pagination } from "@/components/Pagination";

const LIMIT = 20;

export default function Home() {
  const { userId, userInfo, setUserInfo, categories, handleLogin, handleLogout } = useAuth();
  const [sourceFilter, setSourceFilter] = useState<"all" | "gmail" | "naver">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showSenderRules, setShowSenderRules] = useState(false);

  const { messages, setMessages, total, setTotal, offset, setOffset, loading, loadMessages } =
    useMessages({ userId, sourceFilter, categoryFilter, limit: LIMIT });

  const { categoryCounts, loadCategoryCounts } = useCategoryCounts({ userId, sourceFilter });
  const { feedbackStats, loadFeedbackStats } = useFeedbackStats({ userId });

  const {
    syncing,
    classifying,
    applyingLabels,
    selectedMail,
    setSelectedMail,
    editingMailId,
    setEditingMailId,
    handleSync,
    handleClassify,
    handleApplyLabels,
    handleUpdateCategory,
    handleSelectMail,
  } = useMailActions({
    userId,
    userInfo,
    sourceFilter,
    messages,
    setMessages,
    loadMessages,
    loadCategoryCounts,
    loadFeedbackStats,
  });

  const {
    showNaverConnect,
    setShowNaverConnect,
    naverEmail,
    setNaverEmail,
    naverPassword,
    setNaverPassword,
    connectingNaver,
    handleConnectNaver,
    closeNaverConnect,
  } = useNaverConnect({ userId, setUserInfo, loadCategoryCounts });

  const { dragOverCategory, setDragOverCategory, handleDrop } = useDragAndDrop({
    userId,
    sourceFilter,
    categoryFilter,
    offset,
    limit: LIMIT,
    handleUpdateCategory,
    setMessages,
    setTotal,
    loadMessages,
    loadCategoryCounts,
  });

  const handleCategoryFilter = (cat: string | null) => {
    setCategoryFilter(cat);
    setOffset(0);
  };

  const onLogout = () => {
    handleLogout();
    setMessages([]);
    setSelectedMail(null);
  };

  const handleSourceFilterChange = (src: "all" | "gmail" | "naver") => {
    setSourceFilter(src);
    setOffset(0);
  };

  // Not logged in
  if (!userId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Mail detail view
  if (selectedMail) {
    return (
      <MailDetailView
        mail={selectedMail}
        categories={categories}
        onBack={() => setSelectedMail(null)}
        onUpdateCategory={handleUpdateCategory}
      />
    );
  }

  // Mail list view
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const classifiedCount = messages.filter((m) => m.classification).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <AppHeader
        userInfo={userInfo}
        sourceFilter={sourceFilter}
        syncing={syncing}
        classifying={classifying}
        applyingLabels={applyingLabels}
        classifiedCount={classifiedCount}
        onSync={handleSync}
        onClassify={handleClassify}
        onApplyLabels={handleApplyLabels}
        onLogout={onLogout}
        onNaverConnect={() => setShowNaverConnect(true)}
        onSourceFilterChange={handleSourceFilterChange}
      />

      {showNaverConnect && (
        <NaverConnectModal
          naverEmail={naverEmail}
          naverPassword={naverPassword}
          connecting={connectingNaver}
          onEmailChange={setNaverEmail}
          onPasswordChange={setNaverPassword}
          onConnect={handleConnectNaver}
          onClose={closeNaverConnect}
        />
      )}

      <div className="mx-auto max-w-6xl px-6 py-6 flex gap-6">
        <CategorySidebar
          categoryCounts={categoryCounts}
          categoryFilter={categoryFilter}
          feedbackStats={feedbackStats}
          showSenderRules={showSenderRules}
          dragOverCategory={dragOverCategory}
          onCategoryFilter={handleCategoryFilter}
          onToggleSenderRules={() => setShowSenderRules(!showSenderRules)}
          onDragOver={(cat) => setDragOverCategory(cat)}
          onDragLeave={() => setDragOverCategory(null)}
          onDrop={handleDrop}
        />

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
                  <MailListItem
                    key={mail.id}
                    mail={mail}
                    categories={categories}
                    editingMailId={editingMailId}
                    onEdit={(mailId) => setEditingMailId(mailId)}
                    onBlur={() => setEditingMailId(null)}
                    onSelect={handleSelectMail}
                    onDragStart={(e, mailId, classificationId) => {
                      e.dataTransfer.setData("mailId", String(mailId));
                      e.dataTransfer.setData(
                        "classificationId",
                        classificationId ? String(classificationId) : ""
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onUpdateCategory={handleUpdateCategory}
                  />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrev={() => setOffset(Math.max(0, offset - LIMIT))}
                onNext={() => setOffset(offset + LIMIT)}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
