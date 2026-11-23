import { describe, expect, it } from "vitest";
import { toFileAttachments } from "./content";

describe("toFileAttachments", () => {
  it("keeps well-formed entries", () => {
    const files = [{ name: "a.pdf", url: "https://example.test/a.pdf" }];
    expect(toFileAttachments(files)).toEqual(files);
  });

  it("drops malformed entries", () => {
    expect(
      toFileAttachments([{ name: "a" }, null, "x", { name: "b", url: "u" }, { url: "u" }]),
    ).toEqual([{ name: "b", url: "u" }]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(toFileAttachments(null)).toEqual([]);
    expect(toFileAttachments({ name: "a", url: "u" })).toEqual([]);
  });
});
