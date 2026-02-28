interface NaverConnectModalProps {
  naverEmail: string;
  naverPassword: string;
  connecting: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConnect: () => void;
  onClose: () => void;
}

export function NaverConnectModal({
  naverEmail,
  naverPassword,
  connecting,
  onEmailChange,
  onPasswordChange,
  onConnect,
  onClose,
}: NaverConnectModalProps) {
  return (
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
              onChange={(e) => onEmailChange(e.target.value)}
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
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="네이버 앱 비밀번호"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <p className="text-xs text-zinc-500 mt-1">
              네이버 메일 설정에서 IMAP 사용 설정 후 앱 비밀번호를 생성하세요.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-md text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              onClick={onConnect}
              disabled={connecting || !naverEmail || !naverPassword}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {connecting ? "연결 중..." : "연결"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
