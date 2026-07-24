import { describe, expect, it } from "vitest";
import { buildBugReportUrl, recordError, recordFailedRequest } from "./bugReport";

describe("buildBugReportUrl", () => {
  it("includes the title, description, and structured context (no PII fields)", () => {
    const url = buildBugReportUrl({
      title: "업로드가 멈춰요",
      description: "공유 시트로 올릴 때 화면이 멈춤",
      pathname: "/upload",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://github.com/eigger/drop/issues/new");
    expect(parsed.searchParams.get("title")).toBe("업로드가 멈춰요");

    const body = parsed.searchParams.get("body") ?? "";
    expect(body).toContain("공유 시트로 올릴 때 화면이 멈춤");
    expect(body).toContain("/upload");
    expect(body).toContain("앱 버전");
    // 파일명이나 이메일 같은 개인정보 필드는 절대 자동 첨부되지 않는다
    expect(body).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  });

  it("attaches recorded failed requests with method/path/status only", () => {
    recordFailedRequest("GET", "/api/files/marker-req-1", 403);
    const url = buildBugReportUrl({ title: "t", description: "d", pathname: "/x" });
    const body = new URL(url).searchParams.get("body") ?? "";
    expect(body).toContain("GET /api/files/marker-req-1 → 403");
  });

  it("attaches recorded console errors", () => {
    recordError("marker-err-1: something broke");
    const url = buildBugReportUrl({ title: "t", description: "d", pathname: "/x" });
    const body = new URL(url).searchParams.get("body") ?? "";
    expect(body).toContain("marker-err-1: something broke");
  });

  it("caps the ring buffer so only the most recent entries are kept", () => {
    for (let i = 0; i < 10; i++) {
      recordError(`ring-marker-${i}`);
    }
    const url = buildBugReportUrl({ title: "t", description: "d", pathname: "/x" });
    const body = new URL(url).searchParams.get("body") ?? "";
    // only the last 5 of this batch should survive
    expect(body).toContain("ring-marker-9");
    expect(body).toContain("ring-marker-5");
    expect(body).not.toContain("ring-marker-4");
    expect(body).not.toContain("ring-marker-0");
  });
});
