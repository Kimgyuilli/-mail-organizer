import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { CategoryCountsResponse } from "@/features/mail/types";

interface UseCategoryCountsProps {
  sourceFilter: "all" | "gmail" | "naver";
  enabled?: boolean;
}

export function useCategoryCounts({
  sourceFilter,
  enabled = true,
}: UseCategoryCountsProps) {
  const [categoryCounts, setCategoryCounts] = useState<CategoryCountsResponse | null>(null);

  // Auto-load on deps change
  useEffect(() => {
    if (!enabled) return;
    const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
    apiFetch<CategoryCountsResponse>(
      `/api/inbox/category-counts?${sourceParam}`
    )
      .then(setCategoryCounts)
      .catch(() => setCategoryCounts(null));
  }, [sourceFilter, enabled]);

  const loadCategoryCounts = useCallback(async () => {
    try {
      const sourceParam = sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
      const data = await apiFetch<CategoryCountsResponse>(
        `/api/inbox/category-counts?${sourceParam}`
      );
      setCategoryCounts(data);
    } catch {
      setCategoryCounts(null);
    }
  }, [sourceFilter]);

  return { categoryCounts, loadCategoryCounts };
}
