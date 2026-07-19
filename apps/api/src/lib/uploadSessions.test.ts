import { afterEach, describe, expect, it, vi } from "vitest";
import { TEMP_DIR } from "./uploads.js";
import {
  createUploadSession,
  deleteUploadSession,
  getUploadSession,
  sweepStaleUploadSessions,
} from "./uploadSessions.js";

describe("upload sessions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a session with a temp path under TEMP_DIR", () => {
    const session = createUploadSession("user-1", "video.mp4", "video/mp4", 1024);

    expect(session.uploadedById).toBe("user-1");
    expect(session.filename).toBe("video.mp4");
    expect(session.totalSize).toBe(1024);
    expect(session.receivedBytes).toBe(0);
    expect(session.nextChunkIndex).toBe(0);
    expect(session.tempPath.startsWith(TEMP_DIR)).toBe(true);

    deleteUploadSession(session.id);
  });

  it("retrieves a session by id and forgets it once deleted", () => {
    const session = createUploadSession("user-1", "a.txt", "text/plain", 10);
    expect(getUploadSession(session.id)).toBe(session);

    deleteUploadSession(session.id);
    expect(getUploadSession(session.id)).toBeUndefined();
  });

  it("returns undefined for an unknown session id", () => {
    expect(getUploadSession("does-not-exist")).toBeUndefined();
  });

  it("sweeps sessions older than the TTL but keeps fresh ones", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const stale = createUploadSession("user-1", "old.bin", "application/octet-stream", 10);

    vi.setSystemTime(new Date("2026-01-02T00:00:00Z")); // +24h
    const fresh = createUploadSession("user-1", "new.bin", "application/octet-stream", 10);

    vi.setSystemTime(new Date("2026-01-02T01:00:00Z")); // stale is now 25h old, fresh is 1h old
    await sweepStaleUploadSessions();

    expect(getUploadSession(stale.id)).toBeUndefined();
    expect(getUploadSession(fresh.id)).toBe(fresh);

    deleteUploadSession(fresh.id);
  });
});
