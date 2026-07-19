"use client";

import type { FileMeta } from "@drop/shared";
import { API_URL, apiFetch } from "../lib/api";
import { formatBytes } from "../lib/formatBytes";
import { useLocale } from "../lib/i18n/locale-context";
import { FileThumbnail } from "./FileThumbnail";
import { DownloadIcon, MoveIcon, CloseIcon } from "./icons";

export function handleDownload(file: FileMeta) {
  // fetch+blob로 받으면 브라우저 탭 메모리에 파일 전체가 올라간다 — 대용량 파일에서는 이게
  // 병목이라, 로그인 시 심어둔 세션 쿠키로 인증되는 직접 다운로드 링크로 이동시켜 브라우저가
  // 응답을 디스크로 바로 스트리밍하게 한다.
  window.location.href = `${API_URL}/api/files/${file.id}/download`;
}

export function FileRow({
  file,
  onDeleted,
  onMove,
  selectable,
  selected,
  onToggleSelect,
}: {
  file: FileMeta;
  onDeleted: (id: string) => void;
  onMove?: (file: FileMeta) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { t } = useLocale();

  async function handleDelete() {
    if (!confirm(t("deleteConfirm"))) return;
    await apiFetch(`/api/files/${file.id}`, { method: "DELETE" });
    onDeleted(file.id);
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
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={() => onToggleSelect?.(file.id)}
          style={{ width: 18, height: 18, flexShrink: 0, cursor: "pointer" }}
        />
      )}
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
      {!selectable && (
        <>
          <button onClick={() => handleDownload(file)} style={iconButtonStyle} aria-label={t("download")}>
            <DownloadIcon size={16} />
          </button>
          {onMove && (
            <button onClick={() => onMove(file)} style={iconButtonStyle} aria-label={t("move")}>
              <MoveIcon size={16} />
            </button>
          )}
          <button onClick={handleDelete} style={iconButtonStyle} aria-label={t("delete")}>
            <CloseIcon size={16} />
          </button>
        </>
      )}
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
