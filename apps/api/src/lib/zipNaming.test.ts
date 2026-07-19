import { describe, expect, it } from "vitest";
import { uniqueZipEntryName } from "./zipNaming.js";

describe("uniqueZipEntryName", () => {
  it("returns the original name when there is no collision", () => {
    const used = new Set<string>();
    expect(uniqueZipEntryName("photo.jpg", used)).toBe("photo.jpg");
  });

  it("appends a counter suffix on collision, preserving the extension", () => {
    const used = new Set<string>();
    uniqueZipEntryName("photo.jpg", used);
    expect(uniqueZipEntryName("photo.jpg", used)).toBe("photo (2).jpg");
  });

  it("keeps incrementing past multiple collisions", () => {
    const used = new Set<string>();
    uniqueZipEntryName("photo.jpg", used);
    uniqueZipEntryName("photo.jpg", used);
    expect(uniqueZipEntryName("photo.jpg", used)).toBe("photo (3).jpg");
  });

  it("handles filenames with no extension", () => {
    const used = new Set<string>();
    uniqueZipEntryName("README", used);
    expect(uniqueZipEntryName("README", used)).toBe("README (2)");
  });

  it("registers every returned name so later calls keep incrementing", () => {
    const used = new Set<string>();
    const first = uniqueZipEntryName("a.txt", used);
    const second = uniqueZipEntryName("a.txt", used);
    const third = uniqueZipEntryName("a.txt", used);
    expect([first, second, third]).toEqual(["a.txt", "a (2).txt", "a (3).txt"]);
  });
});
