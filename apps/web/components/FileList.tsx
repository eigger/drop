"use client";

import type { FileMeta } from "@drop/shared";
import { FileRow } from "./FileRow";

export function FileList({
  files,
  emptyMessage,
  onDeleted,
  onMove,
  onPreview,
  onInfo,
  selectable,
  selectedIds,
  onToggleSelect,
}: {
  files: FileMeta[];
  emptyMessage: string;
  onDeleted: (id: string) => void;
  onMove?: (file: FileMeta) => void;
  onPreview?: (file: FileMeta) => void;
  onInfo?: (file: FileMeta) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  if (files.length === 0) {
    return <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>{emptyMessage}</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          onDeleted={onDeleted}
          onMove={onMove}
          onPreview={onPreview}
          onInfo={onInfo}
          selectable={selectable}
          selected={selectedIds?.has(file.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </ul>
  );
}
