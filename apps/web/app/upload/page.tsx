"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import type { FileMeta } from "@drop/shared";
import { apiFetch } from "../../lib/api";
import { uploadFileInChunks } from "../../lib/chunkedUpload";
import { getPendingUploads, removePendingUpload, type PendingUpload } from "../../lib/pendingUploads";
import { formatBytes } from "../../lib/formatBytes";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";
import { FileList } from "../../components/FileList";
import { MoveFileModal } from "../../components/MoveFileModal";
import { CloseIcon } from "../../components/icons";

interface ResumableUpload extends PendingUpload {
  receivedBytes: number;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [uploadProgress, setUploadProgress] = useState<{ filename: string; percent: number } | null>(null);
  const [uploaded, setUploaded] = useState<FileMeta[]>([]);
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<ResumableUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // 지난 방문에서 끊긴 업로드가 있는지 서버에 물어본다 — localStorage엔 uploadId만 있고
  // 얼마나 올라갔는지는 서버가 진실 소스라, 세션이 이미 정리됐으면(24시간 경과 등) 조용히
  // 목록에서 지운다.
  useEffect(() => {
    let cancelled = false;
    async function loadResumable() {
      const pending = getPendingUploads();
      const found: ResumableUpload[] = [];
      for (const entry of pending) {
        const res = await apiFetch(`/api/files/uploads/${entry.uploadId}`);
        if (res.ok) {
          const status = (await res.json()) as { receivedBytes: number };
          found.push({ ...entry, receivedBytes: status.receivedBytes });
        } else {
          removePendingUpload(entry.uploadId);
        }
      }
      if (!cancelled) setResumable(found);
    }
    loadResumable();
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadFiles(fileList: FileList) {
    if (fileList.length === 0) return;
    setError(null);
    try {
      // 순서대로 하나씩 올린다 — 청크가 8MB씩이라 동시에 여러 파일을 병렬로 올리면 청크 재시도
      // 로직이 뒤섞이기 쉽고, 가정용 회선/모바일 업로드 대역폭은 어차피 병렬화 이득이 작다.
      for (const file of Array.from(fileList)) {
        setUploadProgress({ filename: file.name, percent: 0 });
        const created = await uploadFileInChunks(file, ({ loaded, total }) => {
          setUploadProgress({ filename: file.name, percent: Math.round((loaded / total) * 100) });
        });
        setUploaded((prev) => [created, ...prev]);
        setResumable((prev) => prev.filter((r) => r.filename !== file.name || r.size !== file.size));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadProgress(null);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  function removeFromSessionList(id: string) {
    setUploaded((prev) => prev.filter((f) => f.id !== id));
  }

  async function discardResumable(uploadId: string) {
    await apiFetch(`/api/files/uploads/${uploadId}`, { method: "DELETE" });
    removePendingUpload(uploadId);
    setResumable((prev) => prev.filter((r) => r.uploadId !== uploadId));
  }

  if (authLoading || !user) return null;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>{t("uploadTitle")}</h1>
      </header>

      {resumable.length > 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t("resumeUploadBanner")}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>{t("resumeUploadHint")}</div>
          {resumable.map((entry) => (
            <div key={entry.uploadId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.filename} ({formatBytes(entry.receivedBytes)} / {formatBytes(entry.size)})
              </span>
              <button onClick={() => discardResumable(entry.uploadId)} style={discardButtonStyle} aria-label={t("discard")}>
                <CloseIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed var(${dragActive ? "--color-primary" : "--color-border"})`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          marginBottom: 16,
        }}
      >
        {uploadProgress ? `${t("uploading")} ${uploadProgress.filename} (${uploadProgress.percent}%)` : t("dropHint")}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {uploaded.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>{t("uploadedJustNow")}</h2>
          <FileList files={uploaded} emptyMessage="" onDeleted={removeFromSessionList} onMove={setMoving} />
        </>
      )}

      <MoveFileModal
        file={moving}
        onClose={() => setMoving(null)}
        onMoved={(fileId, folderId) => {
          setUploaded((prev) => prev.map((f) => (f.id === fileId ? { ...f, folderId } : f)));
          setMoving(null);
        }}
      />
    </main>
  );
}

const discardButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  width: 24,
  height: 24,
  cursor: "pointer",
  color: "var(--color-text-muted)",
  flexShrink: 0,
} as const;
