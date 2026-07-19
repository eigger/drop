import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiJson, ApiError, clearToken, setToken } from "./api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, {})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches the bearer token when logged in", async () => {
    setToken("test-token");
    await apiFetch("/api/files");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("omits the Authorization header when logged out", async () => {
    clearToken();
    await apiFetch("/api/files");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).get("Authorization")).toBeNull();
  });

  it("sends the saved locale as X-Locale", async () => {
    localStorage.setItem("drop_locale", "en");
    await apiFetch("/api/files");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).get("X-Locale")).toBe("en");
  });

  it("does not set Content-Type for FormData bodies", async () => {
    const formData = new FormData();
    formData.append("files", new Blob(["x"]));
    await apiFetch("/api/files", { method: "POST", body: formData });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).has("Content-Type")).toBe(false);
  });

  it("keeps an explicitly set Content-Type (e.g. chunk uploads)", async () => {
    await apiFetch("/api/files/uploads/x/chunks/0", {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob(["chunk"]),
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).get("Content-Type")).toBe("application/octet-stream");
  });

  it("sends credentials so the share-target session cookie gets stored", async () => {
    await apiFetch("/api/files");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.credentials).toBe("include");
  });
});

describe("apiJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })));
    await expect(apiJson("/api/files")).resolves.toEqual({ ok: true });
  });

  it("returns undefined for a 204 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiJson("/api/files/1")).resolves.toBeUndefined();
  });

  it("throws an ApiError carrying the status and string error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "파일을 찾을 수 없습니다" })));
    await expect(apiJson("/api/files/1")).rejects.toMatchObject({
      status: 404,
      message: "파일을 찾을 수 없습니다",
    });
  });

  it("stringifies a structured (zod) error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(400, { error: { fieldErrors: { email: ["Required"] } } })),
    );
    await expect(apiJson("/api/auth/login")).rejects.toThrow(/Required/);
  });
});
