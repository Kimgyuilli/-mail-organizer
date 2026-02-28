interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
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
          onClick={onLogin}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Google 계정으로 로그인
        </button>
      </main>
    </div>
  );
}
