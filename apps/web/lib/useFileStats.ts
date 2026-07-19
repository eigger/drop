"use client";

import { useCallback, useEffect, useState } from "react";
import type { FileStats } from "@drop/shared";
import { apiJson } from "./api";

export function useFileStats(enabled: boolean) {
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await apiJson<FileStats>("/api/files/stats"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { stats, loading, refresh };
}
