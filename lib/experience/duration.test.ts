import { describe, expect, it } from "vitest";
import { calendarMonths, isoMonth, splitMonths } from "./duration";

describe("calendarMonths (both ends included)", () => {
  it.each([
    ["2025-06-16", "2025-07-11", 2],
    ["2025-06-16", "2025-06-17", 1],
    ["2024-01-01", "2024-12-31", 12],
    ["2024-02-01", "2025-04-30", 15],
    ["2023-09-01", "2025-03-01", 19],
  ])("%s → %s is %i months", (start, end, months) => {
    expect(calendarMonths(new Date(start), new Date(end))).toBe(months);
  });

  it("uses the site's time zone at month boundaries", () => {
    // 31 May 22:00 UTC is already 1 June in Istanbul.
    expect(calendarMonths(new Date("2025-05-31T22:00:00Z"), new Date("2025-06-30T12:00:00Z"))).toBe(
      1,
    );
    expect(isoMonth(new Date("2025-05-31T22:00:00Z"))).toBe("2025-06");
  });

  it("never returns less than a month", () => {
    expect(calendarMonths(new Date("2025-07-01"), new Date("2025-06-01"))).toBe(1);
  });

  it("splits into years and months", () => {
    expect(splitMonths(15)).toEqual({ years: 1, months: 3 });
    expect(splitMonths(12)).toEqual({ years: 1, months: 0 });
    expect(splitMonths(2)).toEqual({ years: 0, months: 2 });
  });
});
