import { MailMessage } from "@/types/mail";
import { CategoryBadge } from "@/components/CategoryBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { formatDate } from "@/utils/date";

interface MailListItemProps {
  mail: MailMessage;
  categories: string[];
  editingMailId: number | null;
  onEdit: (mailId: number) => void;
  onBlur: () => void;
  onSelect: (mail: MailMessage) => void;
  onDragStart: (e: React.DragEvent, mailId: number, classificationId: number | null) => void;
  onUpdateCategory: (classificationId: number, category: string, mailId: number) => void;
}

export function MailListItem({
  mail,
  categories,
  editingMailId,
  onEdit,
  onBlur,
  onSelect,
  onDragStart,
  onUpdateCategory,
}: MailListItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart(
          e,
          mail.id,
          mail.classification ? mail.classification.classification_id : null
        );
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
                onUpdateCategory(
                  mail.classification!.classification_id,
                  e.target.value,
                  mail.id
                );
              }}
              onBlur={onBlur}
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
                onEdit(mail.id);
              }}
              title="클릭하여 분류 수정"
            >
              <CategoryBadge
                category={mail.classification.category}
                confidence={null}
                userFeedback={mail.classification.user_feedback}
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
        onClick={() => onSelect(mail)}
        className="flex flex-1 items-center gap-4 text-left min-w-0"
      >
        {/* Sender */}
        <span className="w-40 truncate text-sm text-black dark:text-white">
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
    </div>
  );
}
