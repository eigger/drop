"use client";

import type { CSSProperties, ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 10,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--color-text-muted)" }}>{title}</h2>
      {children}
    </section>
  );
}

export const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  fontSize: 14,
};

export const buttonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
};

export const toggleStyle: CSSProperties = { ...buttonStyle, padding: "8px 16px" };
export const activeToggleStyle: CSSProperties = {
  ...toggleStyle,
  borderColor: "var(--color-primary)",
  color: "var(--color-primary)",
};
