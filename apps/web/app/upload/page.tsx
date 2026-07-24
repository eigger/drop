"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import type { FileMeta } from "@drop/shared";
import QRCode from "qrcode";
import { apiFetch } from "../../lib/api";
import { uploadFileInChunks } from "../../lib/chunkedUpload";
import { getPendingUploads, removePendingUpload, type PendingUpload } from "../../lib/pendingUploads";
import { formatBytes } from "../../lib/formatBytes";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";
import { FileList } from "../../components/FileList";
import { MoveFileModal } from "../../components/MoveFileModal";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import { FileInfoModal } from "../../components/FileInfoModal";
import { CloseIcon } from "../../components/icons";
import { useFileStats } from "../../lib/useFileStats";
import { PageLoader } from "../../components/PageLoader";

interface ResumableUpload extends PendingUpload {
  receivedBytes: number;
}

interface UploadState {
  currentFilename: string;
  currentPercent: number;
  currentFileIndex: number;
  totalFiles: number;
  overallPercent: number;
  overallLoadedBytes: number;
  overallTotalBytes: number;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useLocale();

  const [activeUpload, setActiveUpload] = useState<UploadState | null>(null);
  const [uploaded, setUploaded] = useState<FileMeta[]>([]);
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);
  const [infoFile, setInfoFile] = useState<FileMeta | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<ResumableUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stats, refresh: refreshStats } = useFileStats(!!user);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle temporary token in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      if (token) {
        localStorage.setItem("drop_token", token);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        window.location.reload();
      }
    }
  }, []);

  // Handle clipboard paste to upload files
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (activeUpload) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        uploadFiles(files);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpload]);

  // Handle drawing QR code
  useEffect(() => {
    if (qrModalOpen && qrToken && qrCanvasRef.current) {
      const qrUrl = `${window.location.origin}/upload?token=${qrToken}`;
      QRCode.toCanvas(qrCanvasRef.current, qrUrl, { width: 200, margin: 2 }, (err) => {
        if (err) console.error("Failed to render QR Code:", err);
      });
    }
  }, [qrModalOpen, qrToken]);

  async function handleOpenQrModal() {
    setError(null);
    try {
      const res = await apiFetch("/api/auth/temp-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate upload token");
      const data = await res.json() as { token: string };
      setQrToken(data.token);
      setQrModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

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
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;
    setError(null);

    const totalFiles = filesArray.length;
    const totalBytes = filesArray.reduce((acc, f) => acc + f.size, 0);
    let completedBytes = 0;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = filesArray[i];

        setActiveUpload({
          currentFilename: file.name,
          currentPercent: 0,
          currentFileIndex: i + 1,
          totalFiles,
          overallPercent: Math.round((completedBytes / totalBytes) * 100),
          overallLoadedBytes: completedBytes,
          overallTotalBytes: totalBytes,
        });

        const created = await uploadFileInChunks(file, ({ loaded }) => {
          const currentLoaded = loaded;
          const currentPercent = Math.min(100, Math.round((currentLoaded / file.size) * 100));
          const currentOverallLoaded = completedBytes + currentLoaded;
          const overallPercent = Math.min(100, Math.round((currentOverallLoaded / totalBytes) * 100));

          setActiveUpload({
            currentFilename: file.name,
            currentPercent,
            currentFileIndex: i + 1,
            totalFiles,
            overallPercent,
            overallLoadedBytes: currentOverallLoaded,
            overallTotalBytes: totalBytes,
          });
        });

        completedBytes += file.size;
        setUploaded((prev) => [created, ...prev]);
        setResumable((prev) => prev.filter((r) => r.filename !== file.name || r.size !== file.size));
        refreshStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActiveUpload(null);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (!activeUpload) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function removeFromSessionList(id: string) {
    setUploaded((prev) => prev.filter((f) => f.id !== id));
    refreshStats();
  }

  async function discardResumable(uploadId: string) {
    await apiFetch(`/api/files/uploads/${uploadId}`, { method: "DELETE" });
    removePendingUpload(uploadId);
    setResumable((prev) => prev.filter((r) => r.uploadId !== uploadId));
  }

  if (authLoading || !user) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <PageLoader />
      </main>
    );
  }

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

      {activeUpload && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            marginBottom: 16,
          }}
        >
          {/* Current file title and progress */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
              {t("uploading")} {activeUpload.currentFilename}
            </span>
            <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
              {activeUpload.currentPercent}%
            </span>
          </div>
          {/* Current file progress bar */}
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "var(--color-bg)",
              overflow: "hidden",
              marginBottom: activeUpload.totalFiles > 1 ? 14 : 0,
            }}
          >
            <div
              style={{
                width: `${activeUpload.currentPercent}%`,
                height: "100%",
                background: "var(--color-primary)",
                borderRadius: 999,
                transition: "width 0.2s ease",
              }}
            />
          </div>

          {/* Overall progress if multi-file */}
          {activeUpload.totalFiles > 1 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {locale === "ko"
                    ? `${activeUpload.totalFiles}개의 파일 중 ${activeUpload.currentFileIndex}번째 파일 업로드 중…`
                    : `Uploading file ${activeUpload.currentFileIndex} of ${activeUpload.totalFiles}…`}
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {formatBytes(activeUpload.overallLoadedBytes)} / {formatBytes(activeUpload.overallTotalBytes)} ({activeUpload.overallPercent}%)
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "var(--color-bg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${activeUpload.overallPercent}%`,
                    height: "100%",
                    background: "#4caf50",
                    borderRadius: 999,
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div
        onClick={() => !activeUpload && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!activeUpload) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed var(${dragActive ? "--color-primary" : "--color-border"})`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          cursor: activeUpload ? "not-allowed" : "pointer",
          color: "var(--color-text-muted)",
          marginBottom: 16,
          opacity: activeUpload ? 0.6 : 1,
        }}
      >
        {activeUpload ? t("uploading") : t("dropHint")}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          disabled={!!activeUpload}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {/* Mobile Upload Button */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={handleOpenQrModal}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.2s ease",
          }}
        >
          📱 {locale === "ko" ? "모바일에서 업로드 (QR)" : "Upload from Mobile (QR)"}
        </button>
      </div>

      {error && <p style={{ color: "var(--color-danger)", fontSize: 14, marginBottom: 16 }}>{error}</p>}

      {uploaded.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>{t("uploadedJustNow")}</h2>
          <FileList
            files={uploaded}
            emptyMessage=""
            onDeleted={removeFromSessionList}
            onMove={setMoving}
            onPreview={setPreviewing}
            onInfo={setInfoFile}
          />
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
      <FilePreviewModal file={previewing} onClose={() => setPreviewing(null)} />
      <FileInfoModal file={infoFile} stats={stats} onClose={() => setInfoFile(null)} />

      {/* Mobile Upload QR Modal */}
      {qrModalOpen && (
        <div className="sheet-backdrop" onClick={() => setQrModalOpen(false)} style={{ alignItems: "center", padding: 16 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 360,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              {locale === "ko" ? "모바일에서 파일 업로드" : "Upload Files from Mobile"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
              {locale === "ko"
                ? "스마트폰 카메라로 아래 QR 코드를 스캔하면 로그인 없이 바로 업로드할 수 있는 화면이 열립니다. (10분간 유효)"
                : "Scan this QR code with your phone camera to open the upload page without logging in. (Valid for 10 min)"}
            </p>
            <canvas ref={qrCanvasRef} style={{ background: "#fff", borderRadius: 8, padding: 4 }} />
            <button
              onClick={() => {
                setQrModalOpen(false);
                refreshStats();
                window.location.reload();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--color-primary)",
                color: "var(--color-primary-text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {locale === "ko" ? "완료" : "Done"}
            </button>
          </div>
        </div>
      )}
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
