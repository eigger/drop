"use client";

import type { FileMeta } from "@drop/shared";
import { previewKindForMimeType } from "@drop/shared";
import { API_URL } from "../lib/api";
import { useLocale } from "../lib/i18n/locale-context";
import { formatBytes } from "../lib/formatBytes";
import { CloseIcon, DownloadIcon } from "./icons";
import { handleDownload } from "./FileRow";

// 미리보기는 로그인 시 심어둔 세션 쿠키로 인증되는 /preview URL을 <img>/<video>/<iframe>의
// src에 그대로 넣는다 — fetch로 blob을 받아오면 재생 전에 파일 전체를 메모리에 올려야 해서
// 대용량 동영상 미리보기가 사실상 불가능해진다(다운로드 링크와 같은 이유, [[large-file-upload]]).
export function FilePreviewModal({ file, onClose }: { file: FileMeta | null; onClose: () => void }) {
  const { t } = useLocale();
  if (!file) return null;

  const kind = previewKindForMimeType(file.mimeType);
  const previewUrl = `${API_URL}/api/files/${file.id}/preview`;
  const isMedia = kind === "image" || kind === "video";

  return (
    <div className="sheet-backdrop" onClick={onClose} style={{ alignItems: "center", padding: 16 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.filename}
          </span>
          <button onClick={() => handleDownload(file)} style={iconButtonStyle} aria-label={t("download")}>
            <DownloadIcon size={16} />
          </button>
          <button onClick={onClose} style={iconButtonStyle} aria-label={t("close")}>
            <CloseIcon size={16} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMedia ? 0 : 24,
            background: isMedia ? "#000" : "var(--color-surface)",
            minHeight: 200,
          }}
        >
          {kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={file.filename} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          )}
          {kind === "video" && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={previewUrl} controls style={{ maxWidth: "100%", maxHeight: "80vh" }} />
          )}
          {kind === "audio" && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio src={previewUrl} controls style={{ width: "100%" }} />
          )}
          {(kind === "pdf" || kind === "text") && (
            <iframe
              src={previewUrl}
              title={file.filename}
              style={{ width: "100%", height: "75vh", border: "none", background: "#fff" }}
            />
          )}
          {kind === "none" && (
            <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              <p style={{ marginBottom: 8 }}>{t("previewUnavailable")}</p>
              <p style={{ fontSize: 12, marginBottom: 16 }}>{formatBytes(file.size)}</p>
              <button onClick={() => handleDownload(file)} style={downloadButtonStyle}>
                {t("download")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

const downloadButtonStyle = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "var(--color-primary)",
  color: "var(--color-primary-text)",
  fontWeight: 600,
  cursor: "pointer",
} as const;
