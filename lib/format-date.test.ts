import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("uses the site time zone, not the runtime's", () => {
    // 22:34 UTC is already the next day in Istanbul (UTC+3).
    expect(formatDate("2026-01-24T22:34:58Z", "tr")).toBe("25 Oca 2026");
    expect(formatDate("2026-01-24T22:34:58Z", "en")).toBe("Jan 25, 2026");
  });

  it("follows the page locale and accepts options", () => {
    expect(
      formatDate(new Date("2026-06-01T12:00:00Z"), "tr", { month: "short", year: "numeric" }),
    ).toBe("Haz 2026");
  });
});
