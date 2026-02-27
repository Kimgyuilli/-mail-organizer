"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<string>("checking...");

  useEffect(() => {
    apiFetch<{ status: string }>("/health")
      .then((data) => setHealthStatus(data.status))
      .catch(() => setHealthStatus("disconnected"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 py-32 px-16">
        <h1 className="text-4xl font-bold text-black dark:text-white">
          Mail Organizer
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Gmail + 네이버 메일 통합 관리 플랫폼
        </p>
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              healthStatus === "ok"
                ? "bg-green-500"
                : healthStatus === "checking..."
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-zinc-600 dark:text-zinc-400">
            Backend: {healthStatus}
          </span>
        </div>
      </main>
    </div>
  );
}
