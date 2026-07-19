import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generateThumbnail } from "./imageProcessing.js";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe("generateThumbnail", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "drop-thumb-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("shrinks a large image down to the thumbnail bounds and encodes it as JPEG", async () => {
    const sourcePath = path.join(dir, "source.png");
    const original = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .png()
      .toBuffer();
    await writeFile(sourcePath, original);

    const buffer = await streamToBuffer(generateThumbnail(sourcePath));
    const meta = await sharp(buffer).metadata();

    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBeLessThanOrEqual(400);
    expect(meta.height).toBeLessThanOrEqual(400);
    expect(buffer.byteLength).toBeLessThan(original.byteLength);
  });

  it("does not upscale images smaller than the thumbnail bounds", async () => {
    const sourcePath = path.join(dir, "small.png");
    await writeFile(
      sourcePath,
      await sharp({ create: { width: 100, height: 60, channels: 3, background: "#fff" } }).png().toBuffer(),
    );

    const buffer = await streamToBuffer(generateThumbnail(sourcePath));
    const meta = await sharp(buffer).metadata();

    expect(meta.width).toBe(100);
    expect(meta.height).toBe(60);
  });

  it("rejects when the source is not a valid image", async () => {
    const sourcePath = path.join(dir, "not-an-image.txt");
    await writeFile(sourcePath, "this is definitely not image bytes");

    await expect(streamToBuffer(generateThumbnail(sourcePath))).rejects.toThrow();
  });
});
