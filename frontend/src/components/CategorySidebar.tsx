import { CategoryCountsResponse, FeedbackStats } from "@/types/mail";
import { CATEGORY_COLORS, CATEGORY_DOT_COLORS, DEFAULT_BADGE } from "@/constants/categories";

interface CategorySidebarProps {
  categoryCounts: CategoryCountsResponse | null;
  categoryFilter: string | null;
  feedbackStats: FeedbackStats | null;
  showSenderRules: boolean;
  dragOverCategory: string | null;
  onCategoryFilter: (category: string | null) => void;
  onToggleSenderRules: () => void;
  onDragOver: (category: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, category: string) => void;
}

export function CategorySidebar({
  categoryCounts,
  categoryFilter,
  feedbackStats,
  showSenderRules,
  dragOverCategory,
  onCategoryFilter,
  onToggleSenderRules,
  onDragOver,
  onDragLeave,
  onDrop,
}: CategorySidebarProps) {
  return (
    <aside className="w-56 shrink-0">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        카테고리
      </h2>
      <nav className="space-y-1">
        {/* All */}
        <button
          onClick={() => onCategoryFilter(null)}
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
            onClick={() => onCategoryFilter(cat.name)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(cat.name);
            }}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
              onDrop(e, cat.name);
              onDragLeave();
            }}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
              dragOverCategory === cat.name ? "ring-2 ring-blue-400" : ""
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
          onClick={() => onCategoryFilter("unclassified")}
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
                  onClick={onToggleSenderRules}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                >
                  <span>발신자 규칙 상세</span>
                  <span className="text-zinc-400">
                    {showSenderRules ? "\u25B2" : "\u25BC"}
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
                          <span>&rarr;</span>
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
  );
}
