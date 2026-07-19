"use client";

import { useState } from "react";
import type { FileMeta, FileStats } from "@drop/shared";
import { formatBytes } from "../lib/formatBytes";
import { useLocale } from "../lib/i18n/locale-context";
import { API_URL } from "../lib/api";
import { CloseIcon } from "./icons";

export function FileInfoModal({
  file,
  stats,
  onClose,
}: {
  file: FileMeta | null;
  stats: FileStats | null;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const dateStr = new Date(file.createdAt).toLocaleString(
    locale === "ko" ? "ko-KR" : "en-US",
    { dateStyle: "long", timeStyle: "short" }
  );

  const userFilesRatio =
    stats && stats.totalSize > 0
      ? ((file.size / stats.totalSize) * 100).toFixed(4)
      : null;

  const diskRatio =
    stats && stats.disk.total > 0
      ? ((file.size / stats.disk.total) * 100).toFixed(4)
      : null;

  function handleCopyLink() {
    if (!file) return;
    const link = `${window.location.origin}/api/files/${file.id}/download`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} style={{ alignItems: "center", padding: 16 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 400,
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
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>
            {t("infoTitle") || "File Details"}
          </span>
          <button onClick={onClose} style={iconButtonStyle} aria-label={t("close")}>
            <CloseIcon size={16} />
          </button>
        </header>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
          {/* Thumbnail preview if available */}
          {file.hasThumbnail && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}/api/files/${file.id}/thumbnail`}
                alt={file.filename}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  objectFit: "cover",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                }}
              />
            </div>
          )}

          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoFilename") || "File name"}</span>
            <span style={valueStyle}>{file.filename}</span>
          </div>

          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoFileType") || "File type"}</span>
            <span style={valueStyle}>{file.mimeType}</span>
          </div>

          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoFileSize") || "File size"}</span>
            <span style={valueStyle}>{formatBytes(file.size)} ({file.size.toLocaleString()} bytes)</span>
          </div>

          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoCreatedAt") || "Uploaded at"}</span>
            <span style={valueStyle}>{dateStr}</span>
          </div>

          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoUploadedBy") || "Uploaded by"}</span>
            <span style={valueStyle}>{file.uploadedBy.name}</span>
          </div>

          {userFilesRatio && (
            <div style={infoRowStyle}>
              <span style={labelStyle}>{t("infoUserFilesRatio") || "Ratio of user files"}</span>
              <span style={valueStyle}>{userFilesRatio}%</span>
            </div>
          )}

          {diskRatio && (
            <div style={infoRowStyle}>
              <span style={labelStyle}>{t("infoDiskRatio") || "Ratio of system disk"}</span>
              <span style={valueStyle}>{diskRatio}%</span>
            </div>
          )}

          {/* Shareable Download Link */}
          <div style={infoRowStyle}>
            <span style={labelStyle}>{t("infoShareLink") || "Download link"}</span>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input
                readOnly
                value={`${window.location.origin}/api/files/${file.id}/download`}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                  background: "var(--color-bg)",
                  color: "var(--color-text-muted)",
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: copied ? "#4caf50" : "var(--color-primary)",
                  color: copied ? "#fff" : "var(--color-primary-text)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
              >
                {copied ? (t("copied") || "Copied!") : (t("copy") || "Copy")}
              </button>
            </div>
          </div>
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

const infoRowStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  paddingBottom: 8,
  borderBottom: "1px solid var(--color-border)",
};

const labelStyle = {
  color: "var(--color-text-muted)",
  fontSize: 12,
  fontWeight: 500,
};

const valueStyle = {
  color: "var(--color-text)",
  fontWeight: 600,
  wordBreak: "break-all" as const,
};
