"use client";

import type { FileMeta } from "@drop/shared";
import { apiFetch, apiJson } from "../lib/api";
import { formatBytes } from "../lib/formatBytes";
import { useLocale } from "../lib/i18n/locale-context";
import { FileThumbnail } from "./FileThumbnail";
import { handleDownload } from "./FileRow";
import { DownloadIcon, RestoreIcon, CloseIcon } from "./icons";

export function TrashFileRow({
  file,
  onRestored,
  onPurged,
}: {
  file: FileMeta;
  onRestored: (id: string) => void;
  onPurged: (id: string) => void;
}) {
  const { t } = useLocale();

  async function handleRestore() {
    await apiJson(`/api/files/${file.id}/restore`, { method: "POST" });
    onRestored(file.id);
  }

  async function handlePurge() {
    if (!confirm(t("deleteForeverConfirm"))) return;
    await apiFetch(`/api/files/${file.id}/permanent`, { method: "DELETE" });
    onPurged(file.id);
  }

  return (
    <li
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
      {file.hasThumbnail ? (
        <FileThumbnail fileId={file.id} alt={file.filename} />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: "var(--color-surface-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        >
          {file.mimeType.split("/")[1]?.slice(0, 4).toUpperCase() ?? "FILE"}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.filename}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {formatBytes(file.size)} · {file.uploadedBy.name}
        </div>
      </div>
      <button onClick={() => handleDownload(file)} style={iconButtonStyle} aria-label={t("download")}>
        <DownloadIcon size={16} />
      </button>
      <button onClick={handleRestore} style={iconButtonStyle} aria-label={t("restore")}>
        <RestoreIcon size={16} />
      </button>
      <button onClick={handlePurge} style={{ ...iconButtonStyle, color: "var(--color-danger)" }} aria-label={t("deleteForever")}>
        <CloseIcon size={16} />
      </button>
    </li>
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
