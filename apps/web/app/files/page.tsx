"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FileMeta, FolderContents } from "@drop/shared";
import { API_URL, apiFetch, apiJson } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useSelection } from "../../lib/useSelection";
import { useLocale } from "../../lib/i18n/locale-context";
import { FileList } from "../../components/FileList";
import { MoveFileModal } from "../../components/MoveFileModal";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import { SelectionToolbar } from "../../components/SelectionToolbar";
import { FolderIcon, CloseIcon } from "../../components/icons";

const EMPTY_CONTENTS: FolderContents = { folder: null, breadcrumbs: [], subfolders: [], files: [] };

// useSearchParams()는 정적 프리렌더링 시 Suspense 경계 없이는 빌드가 실패한다
// (Next.js App Router 요구사항) — 그래서 실제 내용은 별도 컴포넌트로 빼고 여기서 감싼다.
export default function BrowseFilesPage() {
  return (
    <Suspense fallback={null}>
      <BrowseFilesPageInner />
    </Suspense>
  );
}

function BrowseFilesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [contents, setContents] = useState<FolderContents>(EMPTY_CONTENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const selection = useSelection();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const path = folderId ? `/api/folders/${folderId}` : "/api/folders/root";
      setContents(await apiJson<FolderContents>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  function goToFolder(id: string | null) {
    router.push(id ? `/files?folder=${id}` : "/files");
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await apiJson("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: newFolderName.trim(), parentId: folderId }),
      });
      setNewFolderName("");
      setCreatingFolder(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm(t("deleteFolderConfirm"))) return;
    try {
      await apiFetch(`/api/folders/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function removeFileLocally(id: string) {
    setContents((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== id) }));
  }

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
    ids.forEach(removeFileLocally);
    selection.cancel();
  }

  function handleToggleSelectAll() {
    if (selection.selectedIds.size === contents.files.length) selection.clearSelection();
    else selection.selectAll(contents.files.map((f) => f.id));
  }

  if (authLoading || !user) return null;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <nav style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 16 }}>
        <button onClick={() => goToFolder(null)} style={crumbStyle(!folderId)}>
          {t("rootFolderLabel")}
        </button>
        {contents.breadcrumbs.map((crumb) => (
          <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <button onClick={() => goToFolder(crumb.id)} style={crumbStyle(crumb.id === folderId)}>
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setCreatingFolder((v) => !v)} style={newFolderButtonStyle}>
          + {t("newFolder")}
        </button>
      </div>

      {creatingFolder && (
        <form onSubmit={handleCreateFolder} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            autoFocus
            placeholder={t("folderNamePlaceholder")}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)" }}
          />
          <button type="submit" style={newFolderButtonStyle}>
            {t("create")}
          </button>
          <button type="button" onClick={() => setCreatingFolder(false)} style={newFolderButtonStyle}>
            {t("cancel")}
          </button>
        </form>
      )}

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {!loading && contents.subfolders.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {contents.subfolders.map((folder) => (
            <li
              key={folder.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                onClick={() => goToFolder(folder.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  color: "var(--color-text)",
                }}
              >
                <FolderIcon size={18} /> {folder.name}
              </button>
              <button onClick={() => handleDeleteFolder(folder.id)} style={iconButtonStyle} aria-label={t("delete")}>
                <CloseIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && contents.subfolders.length === 0 && contents.files.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>{t("emptyFolder")}</p>
      )}

      {!loading && contents.files.length > 0 && (
        <>
          <SelectionToolbar
            active={selection.active}
            count={selection.selectedIds.size}
            allSelected={contents.files.length > 0 && selection.selectedIds.size === contents.files.length}
            onStart={selection.start}
            onCancel={selection.cancel}
            onToggleSelectAll={handleToggleSelectAll}
            onDownload={handleDownloadSelected}
            onDelete={handleDeleteSelected}
          />
          <FileList
            files={contents.files}
            emptyMessage=""
            onDeleted={removeFileLocally}
            onMove={setMoving}
            onPreview={setPreviewing}
            selectable={selection.active}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggle}
          />
        </>
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

function crumbStyle(active: boolean) {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    fontWeight: active ? 600 : 400,
    color: active ? "var(--color-text)" : "var(--color-text-muted)",
  } as const;
}

const iconButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  width: 32,
  height: 32,
  cursor: "pointer",
  color: "var(--color-text)",
  flexShrink: 0,
} as const;

const newFolderButtonStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
} as const;
