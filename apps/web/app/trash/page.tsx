"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FileMeta } from "@drop/shared";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useFiles } from "../../lib/useFiles";
import { useLocale } from "../../lib/i18n/locale-context";
import { TrashFileRow } from "../../components/TrashFileRow";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import { PageLoader } from "../../components/PageLoader";

export default function TrashPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { files, loading, error, removeLocally, refresh } = useFiles(!!user, "/api/files/trash");
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <PageLoader />
      </main>
    );
  }

  async function handleEmptyTrash() {
    if (!confirm(t("emptyTrashConfirm"))) return;
    await apiFetch("/api/files/trash", { method: "DELETE" });
    await refresh();
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h1 style={{ fontSize: 20 }}>{t("trashTitle")}</h1>
        {files.length > 0 && (
          <button onClick={handleEmptyTrash} style={emptyTrashButtonStyle}>
            {t("emptyTrashAction")}
          </button>
        )}
      </header>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>{t("trashHint")}</p>

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {!loading && files.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>{t("emptyTrash")}</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {files.map((file) => (
          <TrashFileRow
            key={file.id}
            file={file}
            onRestored={removeLocally}
            onPurged={removeLocally}
            onPreview={setPreviewing}
          />
        ))}
      </ul>

      <FilePreviewModal file={previewing} onClose={() => setPreviewing(null)} />
    </main>
  );
}

const emptyTrashButtonStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--color-danger)",
} as const;
