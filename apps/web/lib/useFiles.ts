"use client";

import { useCallback, useEffect, useState } from "react";
import type { FileMeta } from "@drop/shared";
import { apiJson } from "./api";

// Home(최근 파일), 파일 브라우징(전체 목록), 휴지통 화면이 각각 다른 범위의 같은 모양 목록을
// 보여줄 뿐이라 데이터 로딩 로직을 한 군데로 모은다 — endpoint만 바꿔서 재사용한다.
export function useFiles(enabled: boolean, endpoint: string = "/api/files") {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFiles(await apiJson<FileMeta[]>(endpoint));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  function removeLocally(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return { files, loading, error, refresh, removeLocally };
}
