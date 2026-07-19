import { describe, expect, it } from "vitest";
import { t, localeFromRequest, type ApiLocale } from "./i18n.js";

function fakeRequest(headerValue?: string | string[]) {
  return { headers: { "x-locale": headerValue } } as unknown as Parameters<typeof localeFromRequest>[0];
}

describe("localeFromRequest", () => {
  it("returns en when the X-Locale header is en", () => {
    expect(localeFromRequest(fakeRequest("en"))).toBe("en");
  });

  it("defaults to ko for any other value", () => {
    expect(localeFromRequest(fakeRequest("fr"))).toBe("ko");
    expect(localeFromRequest(fakeRequest(undefined))).toBe("ko");
  });

  it("uses the first value when the header is duplicated", () => {
    expect(localeFromRequest(fakeRequest(["en", "ko"]))).toBe("en");
  });
});

describe("t", () => {
  it("returns the message in the requested locale", () => {
    expect(t("fileNotFound", "ko")).toBe("파일을 찾을 수 없습니다");
    expect(t("fileNotFound", "en")).toBe("File not found");
  });

  it("interpolates {param} placeholders", () => {
    const locale: ApiLocale = "en";
    expect(t("fileTooLarge", locale, { limit: "10GB" })).toBe("File too large (max 10GB)");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(t("uploadChunkOutOfOrder", "en", {})).toBe("Chunk out of order (expected index {expectedIndex})");
  });
});
