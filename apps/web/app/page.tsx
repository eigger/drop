"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FileMeta } from "@drop/shared";
import { API_URL } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useFiles } from "../lib/useFiles";
import { useSelection } from "../lib/useSelection";
import { useLocale } from "../lib/i18n/locale-context";
import { FileList } from "../components/FileList";
import { MoveFileModal } from "../components/MoveFileModal";
import { FilePreviewModal } from "../components/FilePreviewModal";
import { SelectionToolbar } from "../components/SelectionToolbar";

const RECENT_LIMIT = 8;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { files, loading, error, removeLocally, refresh } = useFiles(!!user);
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);
  const selection = useSelection();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const recent = files.slice(0, RECENT_LIMIT);

  function handleDownloadSelected() {
    const params = Array.from(selection.selectedIds)
      .map((id) => `ids=${encodeURIComponent(id)}`)
      .join("&");
    window.location.href = `${API_URL}/api/files/download-zip?${params}`;
    selection.cancel();
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>{t("homeTitle")}</h1>
        {files.length > RECENT_LIMIT && (
          <Link href="/files" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {t("seeAllFiles")}
          </Link>
        )}
      </header>

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {!loading && recent.length > 0 && (
        <SelectionToolbar
          active={selection.active}
          count={selection.selectedIds.size}
          onStart={selection.start}
          onCancel={selection.cancel}
          onDownload={handleDownloadSelected}
        />
      )}

      {!loading && (
        <FileList
          files={recent}
          emptyMessage={t("noFiles")}
          onDeleted={removeLocally}
          onMove={setMoving}
          onPreview={setPreviewing}
          selectable={selection.active}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
        />
      )}

      <MoveFileModal
        file={moving}
        onClose={() => setMoving(null)}
        onMoved={() => {
          setMoving(null);
          refresh();
        }}
      />
      <FilePreviewModal file={previewing} onClose={() => setPreviewing(null)} />
    </main>
  );
}
