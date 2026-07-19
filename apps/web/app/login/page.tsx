"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { t } = useLocale();

  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    apiJson<{ needsBootstrap: boolean }>("/api/auth/bootstrap/status")
      .then((res) => setNeedsBootstrap(res.needsBootstrap))
      .catch(() => setNeedsBootstrap(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const path = needsBootstrap ? "/api/auth/bootstrap/admin" : "/api/auth/login";
      const body = needsBootstrap ? { name, email, password } : { email, password };
      const res = await apiJson<{ token: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await login(res.token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (needsBootstrap === null) return null;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24 }}>{t("appName")}</h1>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
        {needsBootstrap ? t("bootstrapTitle") : t("loginTitle")}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {needsBootstrap && (
          <input
            placeholder={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && <p style={{ color: "var(--color-danger)", fontSize: 14 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {needsBootstrap ? t("createAccount") : t("login")}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
};

const buttonStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "var(--color-primary)",
  color: "var(--color-primary-text)",
  fontWeight: 600,
  cursor: "pointer",
};
