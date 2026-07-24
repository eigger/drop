"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiJson } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useLocale } from "../../lib/i18n/locale-context";
import type { User } from "../../lib/types";
import { Section, buttonStyle, inputStyle } from "../../components/SettingsUI";
import { PageLoader } from "../../components/PageLoader";

export default function UsersPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { t } = useLocale();

  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "GENERAL">("GENERAL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.replace(user ? "/settings" : "/login");
  }, [authLoading, user, isAdmin, router]);

  async function refresh() {
    try {
      setUsers(await apiJson<User[]>("/api/auth/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiJson("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("GENERAL");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRemove(id: string) {
    if (!confirm(t("removeUserConfirm"))) return;
    try {
      await apiFetch(`/api/auth/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (authLoading || !user || !isAdmin) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <PageLoader />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>{t("usersTitle")}</h1>

      <Section title={t("usersTitle")}>
        <ul style={{ listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>
                  {u.name} <span style={{ color: "var(--color-text-muted)" }}>({u.email})</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {u.role === "ADMIN" ? t("roleAdmin") : t("roleGeneral")}
                </div>
              </div>
              {u.id !== user.id && (
                <button onClick={() => handleRemove(u.id)} style={buttonStyle}>
                  {t("delete")}
                </button>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
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
          <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "GENERAL")} style={inputStyle}>
            <option value="GENERAL">{t("roleGeneral")}</option>
            <option value="ADMIN">{t("roleAdmin")}</option>
          </select>
          {error && <p style={{ color: "var(--color-danger)", fontSize: 13 }}>{error}</p>}
          <button type="submit" style={buttonStyle}>
            {t("addUser")}
          </button>
        </form>
      </Section>
    </main>
  );
}
