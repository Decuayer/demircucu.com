import { describe, expect, it } from "vitest";
import { cvUrlFor } from "./cv";

describe("cvUrlFor", () => {
  const both = { cvUrlTr: "https://x/tr.pdf", cvUrlEn: "https://x/en.pdf" };

  it("picks the page language's CV", () => {
    expect(cvUrlFor(both, "tr")).toBe("https://x/tr.pdf");
    expect(cvUrlFor(both, "en")).toBe("https://x/en.pdf");
  });

  it("falls back to the other language", () => {
    expect(cvUrlFor({ cvUrlTr: "https://x/tr.pdf", cvUrlEn: null }, "en")).toBe("https://x/tr.pdf");
    expect(cvUrlFor({ cvUrlTr: null, cvUrlEn: "https://x/en.pdf" }, "tr")).toBe("https://x/en.pdf");
  });

  it("is null without a CV or settings", () => {
    expect(cvUrlFor({ cvUrlTr: null, cvUrlEn: null }, "tr")).toBeNull();
    expect(cvUrlFor(null, "en")).toBeNull();
  });
});
