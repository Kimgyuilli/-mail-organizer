import { UserInfo } from "@/types/mail";

interface AppHeaderProps {
  userInfo: UserInfo | null;
  sourceFilter: "all" | "gmail" | "naver";
  syncing: boolean;
  classifying: boolean;
  applyingLabels: boolean;
  classifiedCount: number;
  onSync: () => void;
  onClassify: () => void;
  onApplyLabels: () => void;
  onLogout: () => void;
  onNaverConnect: () => void;
  onSourceFilterChange: (source: "all" | "gmail" | "naver") => void;
}

export function AppHeader({
  userInfo,
  sourceFilter,
  syncing,
  classifying,
  applyingLabels,
  classifiedCount,
  onSync,
  onClassify,
  onApplyLabels,
  onLogout,
  onNaverConnect,
  onSourceFilterChange,
}: AppHeaderProps) {
  return (
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
                onClick={onNaverConnect}
                className="rounded-md border border-green-600 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
              >
                네이버 메일 연결
              </button>
            )}
            <button
              onClick={onSync}
              disabled={syncing}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {syncing ? "동기화 중..." : "메일 동기화"}
            </button>
            <button
              onClick={onClassify}
              disabled={classifying}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {classifying ? "분류 중..." : "AI 분류"}
            </button>
            {sourceFilter === "gmail" && (
              <button
                onClick={onApplyLabels}
                disabled={applyingLabels || classifiedCount === 0}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {applyingLabels ? "적용 중..." : "Gmail 라벨 적용"}
              </button>
            )}
            <button
              onClick={onLogout}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Source Filter Tabs */}
        <div className="flex gap-1">
          {(["all", "gmail", "naver"] as const).map((src) => (
            <button
              key={src}
              onClick={() => onSourceFilterChange(src)}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                sourceFilter === src
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              {src === "all" ? "전체" : src === "gmail" ? "Gmail" : "네이버"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
