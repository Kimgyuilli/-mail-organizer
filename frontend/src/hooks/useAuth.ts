import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { UserInfo } from "@/types/mail";

function getInitialUserId(): number | null {
  if (typeof window === "undefined") return null;
  // OAuth callback takes priority
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("user_id");
  if (uid) {
    localStorage.setItem("user_id", uid);
    return Number(uid);
  }
  const stored = localStorage.getItem("user_id");
  return stored ? Number(stored) : null;
}

export function useAuth() {
  const [userId, setUserId] = useState<number | null>(getInitialUserId);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Clean up URL after OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("user_id")) {
      window.history.replaceState({}, "", "/");
    }
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
    userInfo,
    setUserInfo,
    categories,
    handleLogin,
    handleLogout,
  };
}
