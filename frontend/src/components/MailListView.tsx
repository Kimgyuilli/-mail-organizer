import { MailMessage } from "@/types/mail";
import { MailListItem } from "@/components/MailListItem";
import { Pagination } from "@/components/Pagination";

interface MailListViewProps {
  loading: boolean;
  messages: MailMessage[];
  total: number;
  categories: string[];
  editingMailId: number | null;
  classifiedCount: number;
  currentPage: number;
  totalPages: number;
  onEditMail: (mailId: number) => void;
  onEditBlur: () => void;
  onSelectMail: (mail: MailMessage) => void;
  onDragStart: (e: React.DragEvent, mailId: number, classificationId: number | null) => void;
  onUpdateCategory: (classificationId: number, category: string, mailId: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function MailListView({
  loading,
  messages,
  total,
  categories,
  editingMailId,
  classifiedCount,
  currentPage,
  totalPages,
  onEditMail,
  onEditBlur,
  onSelectMail,
  onDragStart,
  onUpdateCategory,
  onPrevPage,
  onNextPage,
}: MailListViewProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="text-zinc-500">로딩 중...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-zinc-500">메일이 없습니다.</p>
        <p className="text-sm text-zinc-400">
          &quot;메일 동기화&quot; 버튼을 눌러 Gmail에서 메일을 가져오세요.
        </p>
      </div>
    );
  }

  return (
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
            onEdit={onEditMail}
            onBlur={onEditBlur}
            onSelect={onSelectMail}
            onDragStart={onDragStart}
            onUpdateCategory={onUpdateCategory}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={onPrevPage}
        onNext={onNextPage}
      />
    </>
  );
}
