"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { FileMeta, FolderMeta } from "@drop/shared";
import { apiJson } from "../lib/api";
import { useLocale } from "../lib/i18n/locale-context";
import { FolderIcon } from "./icons";

function buildIndentedTree(folders: FolderMeta[]): { folder: FolderMeta; depth: number }[] {
  const byParent = new Map<string | null, FolderMeta[]>();
  for (const folder of folders) {
    const list = byParent.get(folder.parentId) ?? [];
    list.push(folder);
    byParent.set(folder.parentId, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const result: { folder: FolderMeta; depth: number }[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const folder of byParent.get(parentId) ?? []) {
      result.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export function MoveFileModal({
  file,
  onClose,
  onMoved,
}: {
  file: FileMeta | null;
  onClose: () => void;
  onMoved: (fileId: string, folderId: string | null) => void;
}) {
  const { t } = useLocale();
  const [folders, setFolders] = useState<FolderMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    setError(null);
    apiJson<FolderMeta[]>("/api/folders/all")
      .then(setFolders)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [file]);

  if (!file) return null;

  async function moveTo(folderId: string | null) {
    if (!file) return;
    try {
      await apiJson(`/api/files/${file.id}/move`, {
        method: "POST",
        body: JSON.stringify({ folderId }),
      });
      onMoved(file.id, folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const tree = buildIndentedTree(folders);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-group-label">{t("moveFileTitle")}</div>

        {error && <p style={{ color: "var(--color-danger)", fontSize: 13, margin: "0 0 8px" }}>{error}</p>}

        {!loading && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>
              <button
                onClick={() => moveTo(null)}
                style={moveItemStyle}
                disabled={file.folderId === null}
              >
                <FolderIcon size={16} /> {t("rootFolderLabel")}
              </button>
            </li>
            {tree.map(({ folder, depth }) => (
              <li key={folder.id}>
                <button
                  onClick={() => moveTo(folder.id)}
                  style={{ ...moveItemStyle, paddingLeft: 16 + depth * 16 }}
                  disabled={folder.id === file.folderId}
                >
                  <FolderIcon size={16} /> {folder.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const moveItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  padding: "10px 16px",
  background: "none",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--color-text)",
  cursor: "pointer",
};
