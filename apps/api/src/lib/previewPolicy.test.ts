import { describe, expect, it } from "vitest";
import { previewKindForMimeType } from "@drop/shared";

describe("previewKindForMimeType", () => {
  it("classifies common image types as previewable images", () => {
    expect(previewKindForMimeType("image/png")).toBe("image");
    expect(previewKindForMimeType("image/jpeg")).toBe("image");
    expect(previewKindForMimeType("image/webp")).toBe("image");
  });

  it("excludes SVG despite being an image type (inline <script> risk)", () => {
    expect(previewKindForMimeType("image/svg+xml")).toBe("none");
  });

  it("classifies video and audio types", () => {
    expect(previewKindForMimeType("video/mp4")).toBe("video");
    expect(previewKindForMimeType("audio/mpeg")).toBe("audio");
  });

  it("classifies application/pdf as pdf", () => {
    expect(previewKindForMimeType("application/pdf")).toBe("pdf");
  });

  it("classifies exactly text/plain as text, not other text/* subtypes", () => {
    expect(previewKindForMimeType("text/plain")).toBe("text");
    expect(previewKindForMimeType("text/html")).toBe("none");
    expect(previewKindForMimeType("text/css")).toBe("none");
  });

  it("falls back to none for unknown/binary types", () => {
    expect(previewKindForMimeType("application/zip")).toBe("none");
    expect(previewKindForMimeType("application/octet-stream")).toBe("none");
  });
});
