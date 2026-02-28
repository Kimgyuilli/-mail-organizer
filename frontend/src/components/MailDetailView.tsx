import { MailDetail } from "@/types/mail";
import { CategoryBadge } from "@/components/CategoryBadge";
import { SourceBadge } from "@/components/SourceBadge";

interface MailDetailViewProps {
  mail: MailDetail;
  categories: string[];
  onBack: () => void;
  onUpdateCategory: (classificationId: number, category: string, mailId: number) => void;
}

export function MailDetailView({
  mail,
  categories,
  onBack,
  onUpdateCategory,
}: MailDetailViewProps) {
  const cls = mail.classification;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          &larr; 목록으로
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SourceBadge source={mail.source} />
              {mail.folder && mail.source === "naver" && (
                <span className="text-xs text-zinc-500">
                  {mail.folder}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {mail.subject || "(제목 없음)"}
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
            {mail.from_name || mail.from_email}
          </span>
          {mail.from_name && (
            <span>&lt;{mail.from_email}&gt;</span>
          )}
          <span className="ml-auto">
            {mail.received_at
              ? new Date(mail.received_at).toLocaleString("ko-KR")
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
            <span className="text-sm text-zinc-500">&rarr;</span>
            <select
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              value={cls.category}
              onChange={(e) =>
                onUpdateCategory(
                  cls.classification_id,
                  e.target.value,
                  mail.id
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
            {mail.body_text || "(본문 없음)"}
          </pre>
        </div>
      </main>
    </div>
  );
}
