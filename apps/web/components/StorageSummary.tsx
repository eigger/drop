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

  // Stacked progress segments for user files
  const segments = TYPE_ORDER.map((category) => {
    const entry = stats.byType[category] ?? { count: 0, size: 0 };
    return {
      category,
      size: entry.size,
      pct: stats.totalSize > 0 ? (entry.size / stats.totalSize) * 100 : 0,
      color: TYPE_COLORS[category],
    };
  }).filter((seg) => seg.size > 0);

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
      {/* 1. User Files Storage Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
          {t("filesStorageTitle")}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
          {formatBytes(stats.totalSize)}
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          display: "flex",
          marginBottom: 16,
        }}
      >
        {segments.length === 0 ? (
          <div style={{ width: "100%", height: "100%", background: "var(--color-border)" }} />
        ) : (
          segments.map((seg) => (
            <div
              key={seg.category}
              style={{
                width: `${seg.pct}%`,
                height: "100%",
                background: seg.color,
                transition: "width 0.3s ease",
              }}
              title={`${t(`fileType_${seg.category}`)}: ${formatBytes(seg.size)}`}
            />
          ))
        )}
      </div>

      {/* Category Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
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

      {/* 2. System Disk Storage Section */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500 }}>
            {t("systemDiskTitle")}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: `${(stats.disk.total > 0 ? stats.disk.used / stats.disk.total : 0) * 100}%`,
              height: "100%",
              background: "var(--color-text-muted)",
              opacity: 0.6,
              borderRadius: 999,
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right" }}>
          {t("storageFree")}: {formatBytes(stats.disk.free)}
        </div>
      </div>
    </section>
  );
}
