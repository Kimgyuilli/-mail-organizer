import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { UserInfo } from "@/types/mail";

export function useAuth() {
  const [userId, setUserId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Read localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("user_id");
    if (uid) {
      localStorage.setItem("user_id", uid);
      setUserId(Number(uid));
      window.history.replaceState({}, "", "/");
    } else {
      const stored = localStorage.getItem("user_id");
      if (stored) setUserId(Number(stored));
    }
    setHydrated(true);
  }, []);

  // Load user info + categories
  useEffect(() => {
    if (!userId) return;
    apiFetch<UserInfo>(`/auth/me?user_id=${userId}`)
      .then(setUserInfo)
      .catch(() => {
        localStorage.removeItem("user_id");
        setUserId(null);
      });
    apiFetch<{ categories: string[] }>("/api/classify/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, [userId]);

  const handleLogin = useCallback(async () => {
    const data = await apiFetch<{ auth_url: string }>("/auth/login");
    window.location.href = data.auth_url;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user_id");
    setUserId(null);
    setUserInfo(null);
  }, []);

  return {
    userId,
    hydrated,
    userInfo,
    setUserInfo,
    categories,
    handleLogin,
    handleLogout,
  };
}
