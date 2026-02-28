interface SourceBadgeProps {
  source: "gmail" | "naver";
  small?: boolean;
}

export function SourceBadge({ source, small }: SourceBadgeProps) {
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
