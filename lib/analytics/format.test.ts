import { describe, expect, it } from "vitest";
import { countryName, formatChange, formatDuration, formatNumber, shortDay } from "./format";

describe("format", () => {
  it("formats durations", () => {
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(5.4)).toBe("0:05");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("formats numbers and changes per locale", () => {
    expect(formatNumber(12345, "tr")).toBe("12.345");
    expect(formatNumber(12345, "en")).toBe("12,345");
    expect(formatNumber(null, "en")).toBe("–");
    expect(formatChange(12.4, "en")).toBe("+12%");
    expect(formatChange(-3.6, "en")).toBe("-4%");
    expect(formatChange(null, "en")).toBeNull();
  });

  it("names countries and days", () => {
    expect(countryName("TR", "tr")).toBe("Türkiye");
    expect(countryName("DE", "en")).toBe("Germany");
    expect(shortDay("2026-11-05", "en")).toBe("Nov 5");
  });
});
