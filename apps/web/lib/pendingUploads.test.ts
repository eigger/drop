import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  savePendingUpload,
  removePendingUpload,
  getPendingUploads,
  findPendingUploadFor,
} from "./pendingUploads";

function makeFile(name: string, size: number): File {
  return new File([new Uint8Array(size)], name);
}

describe("pendingUploads", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and retrieves a pending upload", () => {
    savePendingUpload({ uploadId: "u1", filename: "a.txt", size: 10, mimeType: "text/plain" });
    const all = getPendingUploads();
    expect(all).toHaveLength(1);
    expect(all[0].uploadId).toBe("u1");
  });

  it("replaces an existing entry with the same uploadId instead of duplicating", () => {
    savePendingUpload({ uploadId: "u1", filename: "a.txt", size: 10, mimeType: "text/plain" });
    savePendingUpload({ uploadId: "u1", filename: "a.txt", size: 10, mimeType: "text/plain" });
    expect(getPendingUploads()).toHaveLength(1);
  });

  it("removes an entry by uploadId", () => {
    savePendingUpload({ uploadId: "u1", filename: "a.txt", size: 10, mimeType: "text/plain" });
    savePendingUpload({ uploadId: "u2", filename: "b.txt", size: 20, mimeType: "text/plain" });
    removePendingUpload("u1");
    const all = getPendingUploads();
    expect(all).toHaveLength(1);
    expect(all[0].uploadId).toBe("u2");
  });

  it("matches a pending upload by filename and size", () => {
    savePendingUpload({ uploadId: "u1", filename: "photo.jpg", size: 12345, mimeType: "image/jpeg" });
    const match = findPendingUploadFor(makeFile("photo.jpg", 12345));
    expect(match?.uploadId).toBe("u1");
  });

  it("does not match when size differs", () => {
    savePendingUpload({ uploadId: "u1", filename: "photo.jpg", size: 12345, mimeType: "image/jpeg" });
    expect(findPendingUploadFor(makeFile("photo.jpg", 99))).toBeUndefined();
  });

  it("drops entries older than the max age on read", () => {
    savePendingUpload({ uploadId: "u1", filename: "a.txt", size: 10, mimeType: "text/plain" });

    const raw = JSON.parse(localStorage.getItem("drop_pending_uploads")!);
    raw[0].updatedAt = Date.now() - 25 * 60 * 60 * 1000; // 25h ago, past the 24h TTL
    localStorage.setItem("drop_pending_uploads", JSON.stringify(raw));

    expect(getPendingUploads()).toHaveLength(0);
  });

  it("tolerates corrupted localStorage content", () => {
    localStorage.setItem("drop_pending_uploads", "not json");
    expect(getPendingUploads()).toEqual([]);
  });
});
