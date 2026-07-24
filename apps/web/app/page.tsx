"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FileMeta } from "@drop/shared";
import { API_URL, apiJson } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useFiles } from "../lib/useFiles";
import { useFileStats } from "../lib/useFileStats";
import { useSelection } from "../lib/useSelection";
import { useLocale } from "../lib/i18n/locale-context";
import { FileList } from "../components/FileList";
import { MoveFileModal } from "../components/MoveFileModal";
import { FilePreviewModal } from "../components/FilePreviewModal";
import { FileInfoModal } from "../components/FileInfoModal";
import { SelectionToolbar } from "../components/SelectionToolbar";
import { StorageSummary } from "../components/StorageSummary";
import { PageLoader } from "../components/PageLoader";

const RECENT_LIMIT = 5;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { files, loading, error, removeLocally, refresh } = useFiles(!!user);
  const { stats, refresh: refreshStats } = useFileStats(!!user);
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);
  const [infoFile, setInfoFile] = useState<FileMeta | null>(null);
  const selection = useSelection();

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

  const recent = files.slice(0, RECENT_LIMIT);

  function handleDownloadSelected() {
    const params = Array.from(selection.selectedIds)
      .map((id) => `ids=${encodeURIComponent(id)}`)
      .join("&");
    window.location.href = `${API_URL}/api/files/download-zip?${params}`;
    selection.cancel();
  }

  async function handleDeleteSelected() {
    if (!confirm(t("deleteSelectedConfirm"))) return;
    const ids = Array.from(selection.selectedIds);
    await apiJson("/api/files/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) });
    ids.forEach(removeLocally);
    selection.cancel();
    refreshStats();
  }

  function handleToggleSelectAll() {
    if (selection.selectedIds.size === recent.length) selection.clearSelection();
    else selection.selectAll(recent.map((f) => f.id));
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>{t("homeTitle")}</h1>
      </header>

      {stats && <StorageSummary stats={stats} />}

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, color: "var(--color-text-muted)" }}>{t("recentFiles")}</h2>
        {files.length > RECENT_LIMIT && (
          <Link href="/files" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {t("seeAllFiles")}
          </Link>
        )}
      </div>

      {!loading && recent.length > 0 && (
        <SelectionToolbar
          active={selection.active}
          count={selection.selectedIds.size}
          allSelected={recent.length > 0 && selection.selectedIds.size === recent.length}
          onStart={selection.start}
          onCancel={selection.cancel}
          onToggleSelectAll={handleToggleSelectAll}
          onDownload={handleDownloadSelected}
          onDelete={handleDeleteSelected}
        />
      )}

      {!loading && (
        <FileList
          files={recent}
          emptyMessage={t("noFiles")}
          onDeleted={(id) => {
            removeLocally(id);
            refreshStats();
          }}
          onMove={setMoving}
          onPreview={setPreviewing}
          onInfo={setInfoFile}
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
      <FileInfoModal file={infoFile} stats={stats} onClose={() => setInfoFile(null)} />
    </main>
  );
}
