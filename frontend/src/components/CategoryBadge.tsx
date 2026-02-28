import { CATEGORY_COLORS, DEFAULT_BADGE } from "@/constants/categories";

interface CategoryBadgeProps {
  category: string;
  confidence: number | null;
  userFeedback: string | null;
  small?: boolean;
}

export function CategoryBadge({
  category,
  confidence,
  userFeedback,
  small,
}: CategoryBadgeProps) {
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
