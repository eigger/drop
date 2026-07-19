import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UPLOAD_CHUNK_SIZE_BYTES } from "@drop/shared";
import { uploadFileInChunks } from "./chunkedUpload";
import { ApiError } from "./api";
import { savePendingUpload, getPendingUploads } from "./pendingUploads";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, apiFetch: vi.fn() };
});

import { apiFetch } from "./api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("uploadFileInChunks", () => {
  // resolveStartingPoint()가 이어 올리기 판단에 localStorage(drop_pending_uploads)를 쓰기 때문에,
  // 이전 테스트가 실패로 끝나 정리 안 된 항목이 다음 테스트의 같은 이름 파일에 새어 들어가지
  // 않도록 매번 비운다.
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("uploads a small file as a single chunk: init, one PUT, complete", async () => {
    const file = new File([new Uint8Array(10)], "note.txt", { type: "text/plain" });
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "u1" });
      if (path.includes("/chunks/")) return jsonResponse(200, { receivedBytes: 10, nextChunkIndex: 1 });
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f1" });
      throw new Error(`unexpected path ${path}`);
    });

    await uploadFileInChunks(file);

    const calls = vi.mocked(apiFetch).mock.calls.map(([path]) => path);
    expect(calls).toEqual(["/api/files/uploads", "/api/files/uploads/u1/chunks/0", "/api/files/uploads/u1/complete"]);
  });

  it("splits a file larger than the chunk size into multiple sequential PUTs", async () => {
    const size = UPLOAD_CHUNK_SIZE_BYTES + 1024;
    const file = new File([new Uint8Array(size)], "big.bin", { type: "application/octet-stream" });
    const chunkCalls: string[] = [];

    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "u2" });
      if (path.includes("/chunks/")) {
        chunkCalls.push(path);
        return jsonResponse(200, {});
      }
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f2" });
      throw new Error(`unexpected path ${path}`);
    });

    const progress: number[] = [];
    await uploadFileInChunks(file, ({ loaded }) => progress.push(loaded));

    expect(chunkCalls).toEqual(["/api/files/uploads/u2/chunks/0", "/api/files/uploads/u2/chunks/1"]);
    expect(progress).toEqual([UPLOAD_CHUNK_SIZE_BYTES, size]);
  });

  it("retries a failed chunk and succeeds once the retry goes through", async () => {
    const file = new File([new Uint8Array(10)], "note.txt", { type: "text/plain" });
    let chunkAttempts = 0;

    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "u3" });
      if (path.includes("/chunks/")) {
        chunkAttempts += 1;
        return chunkAttempts === 1 ? jsonResponse(500, { error: "boom" }) : jsonResponse(200, {});
      }
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f3" });
      throw new Error(`unexpected path ${path}`);
    });

    await uploadFileInChunks(file);
    expect(chunkAttempts).toBe(2);
  }, 10000);

  it("gives up after exhausting retries and throws an ApiError", async () => {
    const file = new File([new Uint8Array(10)], "note.txt", { type: "text/plain" });

    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "u4" });
      if (path.includes("/chunks/")) return jsonResponse(500, { error: "persistent failure" });
      throw new Error(`unexpected path ${path}`);
    });

    await expect(uploadFileInChunks(file)).rejects.toBeInstanceOf(ApiError);
  }, 10000);

  it("throws when the init request fails", async () => {
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse(413, { error: "too large" }));
    const file = new File([new Uint8Array(10)], "note.txt", { type: "text/plain" });

    await expect(uploadFileInChunks(file)).rejects.toBeInstanceOf(ApiError);
  });

  it("resumes from the server's reported progress when a matching pending upload exists", async () => {
    const size = UPLOAD_CHUNK_SIZE_BYTES * 2;
    const file = new File([new Uint8Array(size)], "resume.bin", { type: "application/octet-stream" });
    savePendingUpload({ uploadId: "u5", filename: "resume.bin", size, mimeType: "application/octet-stream" });

    const chunkCalls: string[] = [];
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads/u5") {
        return jsonResponse(200, { receivedBytes: UPLOAD_CHUNK_SIZE_BYTES, nextChunkIndex: 1 });
      }
      if (path.includes("/chunks/")) {
        chunkCalls.push(path);
        return jsonResponse(200, {});
      }
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f5" });
      throw new Error(`unexpected path ${path}`);
    });

    const progress: number[] = [];
    await uploadFileInChunks(file, ({ loaded }) => progress.push(loaded));

    // 이미 받은 첫 청크(index 0)는 다시 보내지 않고 남은 청크(index 1)부터 이어간다.
    expect(chunkCalls).toEqual(["/api/files/uploads/u5/chunks/1"]);
    expect(progress).toEqual([UPLOAD_CHUNK_SIZE_BYTES, size]);
  });

  it("falls back to a fresh upload when the server no longer has the pending session", async () => {
    const file = new File([new Uint8Array(10)], "gone.txt", { type: "text/plain" });
    savePendingUpload({ uploadId: "stale", filename: "gone.txt", size: 10, mimeType: "text/plain" });

    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads/stale") return jsonResponse(404, { error: "gone" });
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "fresh" });
      if (path.includes("/chunks/")) return jsonResponse(200, {});
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f6" });
      throw new Error(`unexpected path ${path}`);
    });

    await uploadFileInChunks(file);

    const calls = vi.mocked(apiFetch).mock.calls.map(([path]) => path);
    expect(calls).toEqual([
      "/api/files/uploads/stale",
      "/api/files/uploads",
      "/api/files/uploads/fresh/chunks/0",
      "/api/files/uploads/fresh/complete",
    ]);
  });

  it("removes the pending-upload record once the upload completes", async () => {
    const file = new File([new Uint8Array(10)], "note.txt", { type: "text/plain" });
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/files/uploads") return jsonResponse(201, { uploadId: "u7" });
      if (path.includes("/chunks/")) return jsonResponse(200, {});
      if (path.endsWith("/complete")) return jsonResponse(201, { id: "f7" });
      throw new Error(`unexpected path ${path}`);
    });

    await uploadFileInChunks(file);
    expect(getPendingUploads()).toEqual([]);
  });
});
