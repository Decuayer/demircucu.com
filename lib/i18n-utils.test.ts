import { describe, expect, it } from "vitest";
import { formatDate, getTranslated } from "./i18n-utils";

describe("getTranslated", () => {
  const project = { titleTr: "Başlık", titleEn: "Title", summaryTr: "", summaryEn: "Summary" };

  it("returns the field for the requested locale", () => {
    expect(getTranslated(project, "title", "tr")).toBe("Başlık");
    expect(getTranslated(project, "title", "en")).toBe("Title");
  });

  it("falls back to the other locale when the requested one is empty", () => {
    expect(getTranslated(project, "summary", "tr")).toBe("Summary");
  });

  it("falls back to the un-suffixed field", () => {
    expect(getTranslated({ name: "legacy" }, "name", "en")).toBe("legacy");
  });

  it("returns an empty string for missing objects or fields", () => {
    expect(getTranslated(null, "title", "tr")).toBe("");
    expect(getTranslated(undefined, "title", "tr")).toBe("");
    expect(getTranslated({}, "title", "tr")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats as DD.MM.YYYY with zero padding", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05.01.2026");
  });

  it("accepts strings and timestamps", () => {
    expect(formatDate(new Date(2025, 11, 31).toISOString())).toBe("31.12.2025");
    expect(formatDate(new Date(2024, 1, 29).getTime())).toBe("29.02.2024");
  });
});
