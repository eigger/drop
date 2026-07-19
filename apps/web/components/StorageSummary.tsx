"use client";

import type { FileStats, FileTypeCategory } from "@drop/shared";
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

export function StorageSummary({ stats }: { stats: FileStats }) {
  const { t } = useLocale();
  const usedRatio = stats.disk.total > 0 ? Math.min(1, stats.disk.used / stats.disk.total) : 0;

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t("storageUsed")}</span>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${usedRatio * 100}%`,
            height: "100%",
            background: "var(--color-primary)",
            borderRadius: 999,
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
        {t("storageFree")}: {formatBytes(stats.disk.free)}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
        {TYPE_ORDER.map((category) => {
          const Icon = TYPE_ICON[category];
          const entry = stats.byType[category] ?? { count: 0, size: 0 };
          return (
            <div
              key={category}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: 8,
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t(`fileType_${category}`)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
