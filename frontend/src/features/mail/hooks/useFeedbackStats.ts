import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { FeedbackStats } from "@/features/mail/types";

interface UseFeedbackStatsProps {
  enabled?: boolean;
}

export function useFeedbackStats({ enabled = true }: UseFeedbackStatsProps = {}) {
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  // Auto-load
  useEffect(() => {
    if (!enabled) return;
    apiFetch<FeedbackStats>("/api/classify/feedback-stats")
      .then(setFeedbackStats)
      .catch(() => setFeedbackStats(null));
  }, [enabled]);

  const loadFeedbackStats = useCallback(async () => {
    try {
      const data = await apiFetch<FeedbackStats>(
        "/api/classify/feedback-stats"
      );
      setFeedbackStats(data);
    } catch {
      setFeedbackStats(null);
    }
  }, []);

  return { feedbackStats, loadFeedbackStats };
}
