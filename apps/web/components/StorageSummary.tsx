"use client";

import type { FileStats, FileTypeCategory } from "@drop/shared";
import Link from "next/link";
import { formatBytes } from "../lib/formatBytes";
import { useLocale } from "../lib/i18n/locale-context";
import { ImageTypeIcon, VideoTypeIcon, AudioTypeIcon, DocumentTypeIcon, OtherTypeIcon } from "./icons";

const TYPE_ORDER: FileTypeCategory[] = ["image", "video", "audio", "document", "other"];

const TYPE_ICON: Record<FileTypeCategory, (props: { size?: number }) => JSX.Element> = {
  image: ImageTypeIcon,
  video: VideoTypeIcon,
  audio: AudioTypeIcon,
  document: DocumentTypeIcon,
  other: OtherTypeIcon,
};

const TYPE_COLORS: Record<FileTypeCategory, string> = {
  image: "#e91e63",      // Rose/Pink
  video: "#9c27b0",      // Purple
  audio: "#00bcd4",      // Cyan
  document: "#4caf50",   // Green
  other: "#9e9e9e",      // Grey
};

export function StorageSummary({ stats }: { stats: FileStats }) {
  const { t } = useLocale();

  const totalDisk = stats.disk.total;
  const systemUsed = Math.max(0, stats.disk.used - stats.totalSize);

  // Stacked progress segments for total disk space
  const segments = [
    ...TYPE_ORDER.map((category) => {
      const entry = stats.byType[category] ?? { count: 0, size: 0 };
      return {
        key: category,
        size: entry.size,
        color: TYPE_COLORS[category],
        title: `${t(`fileType_${category}`)}: ${formatBytes(entry.size)}`,
      };
    }),
    {
      key: "system",
      size: systemUsed,
      color: "var(--color-border)", // Elegant neutral color that adapts to dark/light themes
      title: `System & Other: ${formatBytes(systemUsed)}`,
    },
  ]
    .filter((seg) => seg.size > 0)
    .map((seg) => ({
      ...seg,
      pct: totalDisk > 0 ? (seg.size / totalDisk) * 100 : 0,
    }));

  return (
    <section
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 10,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Storage Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
          {t("storageUsed")}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
          {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
        </span>
      </div>

      {/* Stacked Disk Progress Bar */}
      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          display: "flex",
          marginBottom: 8,
        }}
      >
        {segments.length === 0 ? (
          <div style={{ width: "100%", height: "100%", background: "var(--color-border)" }} />
        ) : (
          segments.map((seg) => (
            <div
              key={seg.key}
              style={{
                width: `${seg.pct}%`,
                height: "100%",
                background: seg.color,
                transition: "width 0.3s ease",
              }}
              title={seg.title}
            />
          ))
        )}
      </div>

      {/* Capacity Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <span>
          {t("storageFree")}: {formatBytes(stats.disk.free)}
        </span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--color-border)" }} />
            System: {formatBytes(systemUsed)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
            Files: {formatBytes(stats.totalSize)}
          </span>
        </span>
      </div>

      {/* Category Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
        {TYPE_ORDER.map((category) => {
          const Icon = TYPE_ICON[category];
          const entry = stats.byType[category] ?? { count: 0, size: 0 };
          const color = TYPE_COLORS[category];
          return (
            <Link
              href={`/files?type=${category}`}
              key={category}
              className="storage-summary-card"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "12px 6px",
                borderRadius: 8,
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                textDecoration: "none",
                color: "var(--color-text)",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              <span style={{ color }}><Icon size={20} /></span>
              <span style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{entry.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{formatBytes(entry.size)}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)", marginTop: 2 }}>
                {t(`fileType_${category}`)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
