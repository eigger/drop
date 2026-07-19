function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // 배포(Caddy)에서는 same-origin(/api) 호출이 맞고, 로컬 개발에서는 8080 API를 기본값으로 쓴다.
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://localhost:8080";
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = "drop_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const locale = typeof window !== "undefined" ? localStorage.getItem("drop_locale") : null;
  if (locale) headers.set("X-Locale", locale);
  // 로그인 응답의 Set-Cookie(공유 시트 인증용 drop_session)가 저장되려면 크로스오리진 개발
  // 환경에서도 credentials가 필요하다 — 배포(Caddy, 동일 오리진)에서는 없어도 무해하다.
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store", credentials: "include" });
}

function requestFailedMessage(status: number): string {
  const locale = typeof window !== "undefined" ? localStorage.getItem("drop_locale") : null;
  return locale === "en" ? `Request failed (${status})` : `요청 실패 (${status})`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      typeof body?.error === "string"
        ? body.error
        : body?.error
          ? JSON.stringify(body.error)
          : requestFailedMessage(res.status);
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await apiFetch(path);
  if (!res.ok) throw new ApiError(requestFailedMessage(res.status), res.status);
  return res.blob();
}
