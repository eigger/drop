"use client";

import { useLocale } from "../lib/i18n/locale-context";

export function SelectionToolbar({
  active,
  count,
  onStart,
  onCancel,
  onDownload,
}: {
  active: boolean;
  count: number;
  onStart: () => void;
  onCancel: () => void;
  onDownload: () => void;
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        {count}
        {t("selectedSuffix")}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onDownload} disabled={count === 0} style={buttonStyle}>
          {t("downloadSelectedZip")}
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
