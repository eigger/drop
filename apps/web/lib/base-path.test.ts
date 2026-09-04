import { describe, expect, it } from "vitest";
import { routePath, stripBasePath, withBasePath } from "./base-path";

describe("routePath", () => {
  it("treats empty values as the app root", () => {
    expect(routePath(null)).toBe("/");
    expect(routePath(undefined)).toBe("/");
    expect(routePath("")).toBe("/");
  });

  it("strips the trailing slash trailingSlash puts on usePathname()", () => {
    expect(routePath("/login/")).toBe("/login");
    expect(routePath("/upload/")).toBe("/upload");
    expect(routePath("/")).toBe("/");
  });

  it("leaves an already-canonical path alone", () => {
    expect(routePath("/login")).toBe("/login");
    expect(routePath("/files")).toBe("/files");
  });
});

describe("withBasePath", () => {
  it("prefixes nothing in the default (root) test env", () => {
    expect(withBasePath("/sw.js")).toBe("/sw.js");
    expect(withBasePath("/")).toBe("/");
  });
});

describe("stripBasePath", () => {
  it("is a no-op when the app is at the origin root", () => {
    expect(stripBasePath("/api/files", "")).toBe("/api/files");
    expect(stripBasePath("/login/", "")).toBe("/login/");
  });

  it("strips an exact prefix and a prefix followed by a slash", () => {
    expect(stripBasePath("/drop", "/drop")).toBe("/");
    expect(stripBasePath("/drop/", "/drop")).toBe("/");
    expect(stripBasePath("/drop/api/share-target", "/drop")).toBe("/api/share-target");
  });

  it("does not treat a longer sibling path as under the prefix", () => {
    expect(stripBasePath("/dropdown", "/drop")).toBe("/dropdown");
    expect(stripBasePath("/drop-files", "/drop")).toBe("/drop-files");
  });
});
