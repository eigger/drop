"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";
import { Section, buttonStyle, toggleStyle, activeToggleStyle } from "../../components/SettingsUI";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>{t("settingsTitle")}</h1>

      <Section title={t("profileTitle")}>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <div>{user.name}</div>
          <div style={{ color: "var(--color-text-muted)" }}>{user.email}</div>
          <div style={{ color: "var(--color-text-muted)" }}>
            {user.role === "ADMIN" ? t("roleAdmin") : t("roleGeneral")}
          </div>
        </div>
        <button onClick={logout} style={{ ...buttonStyle, marginTop: 12 }}>
          {t("logout")}
        </button>
      </Section>

      <Section title={t("languageLabel")}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setLocale("ko")} style={locale === "ko" ? activeToggleStyle : toggleStyle}>
            한국어
          </button>
          <button onClick={() => setLocale("en")} style={locale === "en" ? activeToggleStyle : toggleStyle}>
            English
          </button>
        </div>
      </Section>
    </main>
  );
}
