"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";
import { apiJson, ApiError } from "../../lib/api";
import { Section, buttonStyle, inputStyle, toggleStyle, activeToggleStyle } from "../../components/SettingsUI";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    try {
      await apiJson("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : String(err));
    }
  }

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

      <Section title={t("changePasswordTitle")}>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="password"
            placeholder={t("currentPassword")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder={t("newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder={t("confirmNewPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {passwordError && <p style={{ color: "var(--color-danger)", fontSize: 13 }}>{passwordError}</p>}
          {passwordSuccess && <p style={{ color: "var(--color-primary)", fontSize: 13 }}>{t("passwordChanged")}</p>}
          <button type="submit" style={buttonStyle}>
            {t("changePassword")}
          </button>
        </form>
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
