"use client";

import { useLocale } from "../lib/i18n/locale-context";

export function SelectionToolbar({
  active,
  count,
  allSelected,
  onStart,
  onCancel,
  onToggleSelectAll,
  onDownload,
  onDelete,
}: {
  active: boolean;
  count: number;
  allSelected: boolean;
  onStart: () => void;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();

  if (!active) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={onStart} style={buttonStyle}>
          {t("select")}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        {count}
        {t("selectedSuffix")}
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onDownload} disabled={count === 0} style={buttonStyle}>
          {t("downloadSelectedZip")}
        </button>
        <button onClick={onDelete} disabled={count === 0} style={{ ...buttonStyle, color: "var(--color-danger)" }}>
          {t("delete")}
        </button>
        <button onClick={onCancel} style={buttonStyle}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
} as const;
