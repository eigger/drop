"use client";

import { useEffect, useState } from "react";
import { apiBlob } from "../lib/api";

export function FileThumbnail({ fileId, alt }: { fileId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    apiBlob(`/api/files/${fileId}/thumbnail`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--color-surface-hover)" }} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={48} height={48} style={{ objectFit: "cover", borderRadius: 8 }} />;
}
