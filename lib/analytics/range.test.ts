import { describe, expect, it } from "vitest";
import { addDays, daysBetween, eachDay, parseRange, percentChange } from "./range";

const NOW = new Date("2026-11-26T10:00:00Z");

describe("parseRange", () => {
  it("defaults to the last 30 days with the 30 days before as the previous period", () => {
    const range = parseRange({}, NOW);
    expect(range).toMatchObject({ preset: "30d", from: "2026-10-28", to: "2026-11-26", days: 30 });
    expect(range.previous).toEqual({ from: "2026-09-28", to: "2026-10-27" });
  });

  it.each([
    ["today", "2026-11-26", 1, { from: "2026-11-25", to: "2026-11-25" }],
    ["7d", "2026-11-20", 7, { from: "2026-11-13", to: "2026-11-19" }],
    ["90d", "2026-08-29", 90, { from: "2026-05-31", to: "2026-08-28" }],
  ])("%s", (preset, from, days, previous) => {
    const range = parseRange({ range: preset }, NOW);
    expect(range).toMatchObject({ from, to: "2026-11-26", days, previous });
  });

  it("12m covers one year up to today", () => {
    const range = parseRange({ range: "12m" }, NOW);
    expect(range.from).toBe("2025-11-27");
    expect(range.days).toBe(365);
    expect(range.previous.to).toBe("2025-11-26");
    expect(daysBetween(range.previous.from, range.previous.to)).toBe(365);
  });

  it("accepts a custom range and clamps it to today", () => {
    const range = parseRange({ range: "custom", from: "2026-11-01", to: "2026-12-31" }, NOW);
    expect(range).toMatchObject({
      preset: "custom",
      from: "2026-11-01",
      to: "2026-11-26",
      days: 26,
    });
    expect(range.previous).toEqual({ from: "2026-10-06", to: "2026-10-31" });
  });

  it("moves a from date after to back to to", () => {
    const range = parseRange({ range: "custom", from: "2026-11-20", to: "2026-11-10" }, NOW);
    expect(range).toMatchObject({ from: "2026-11-10", to: "2026-11-10", days: 1 });
  });

  it("limits custom ranges to 400 days", () => {
    const range = parseRange({ range: "custom", from: "2020-01-01", to: "2026-11-26" }, NOW);
    expect(range.days).toBe(400);
  });

  it.each([
    { range: "custom", from: "2026-02-30", to: "2026-03-01" },
    { range: "custom", from: "yesterday", to: "2026-03-01" },
    { range: "custom" },
    { range: "forever" },
    { range: ["7d", "30d"] },
  ])("falls back for %o", (params) => {
    const range = parseRange(params, NOW);
    expect(range.days).toBe(Array.isArray(params.range) ? 7 : 30);
  });
});

describe("day helpers", () => {
  it("adds days across months and leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

describe("percentChange", () => {
  it("computes the change and handles a zero previous value", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
  });
});
