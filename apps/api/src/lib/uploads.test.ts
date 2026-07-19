import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UPLOAD_DIR, THUMB_DIR, deleteStoredFile, deleteThumbnail } from "./uploads.js";

describe("deleteStoredFile", () => {
  const testFile = "vitest-temp-file.txt";
  const filePath = path.join(UPLOAD_DIR, testFile);

  afterEach(async () => {
    await rm(filePath, { force: true });
  });

  it("deletes an existing file", async () => {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, "fake file bytes");
    expect(existsSync(filePath)).toBe(true);

    await deleteStoredFile(testFile);

    expect(existsSync(filePath)).toBe(false);
  });

  it("does not throw when the file does not exist", async () => {
    await expect(deleteStoredFile("nonexistent-file.txt")).resolves.toBeUndefined();
  });
});

describe("deleteThumbnail", () => {
  const testFile = "vitest-temp-thumb.jpg";
  const filePath = path.join(THUMB_DIR, testFile);

  afterEach(async () => {
    await rm(filePath, { force: true });
  });

  it("deletes an existing thumbnail", async () => {
    await mkdir(THUMB_DIR, { recursive: true });
    await writeFile(filePath, "fake jpeg bytes");
    expect(existsSync(filePath)).toBe(true);

    await deleteThumbnail(testFile);

    expect(existsSync(filePath)).toBe(false);
  });

  it("does not throw when the thumbnail does not exist", async () => {
    await expect(deleteThumbnail("nonexistent-thumb.jpg")).resolves.toBeUndefined();
  });
});
