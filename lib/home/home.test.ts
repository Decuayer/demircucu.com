import { describe, expect, it } from "vitest";
import { monthsBetween, splitMonths } from "./duration";
import { stripGreeting } from "./hero";
import { MAX_FEATURED_PROJECTS, projectGrid } from "./layout";

describe("projectGrid", () => {
  it("never leaves an empty column", () => {
    expect([1, 2, 3, 4].map(projectGrid)).toEqual(["single", "two", "three", "two"]);
    expect(projectGrid(0)).toBe("single");
    expect(MAX_FEATURED_PROJECTS).toBe(4);
  });
});

describe("stripGreeting", () => {
  it("keeps a plain name", () => {
    expect(stripGreeting("Demir Cücü", "Merhaba, ben", "tr")).toBe("Demir Cücü");
  });

  it("drops a greeting the title already contains, in any case and punctuation", () => {
    expect(stripGreeting("Merhaba, ben Örnek", "Merhaba, ben", "tr")).toBe("Örnek");
    expect(stripGreeting("MERHABA BEN Demir", "Merhaba, ben", "tr")).toBe("Demir");
    expect(stripGreeting("Hi, I'm Demir Cücü", "Hi, I'm", "en")).toBe("Demir Cücü");
  });

  it("does not cut a name that only starts like the greeting", () => {
    expect(stripGreeting("Merhabaoğlu Ali", "Merhaba, ben", "tr")).toBe("Merhabaoğlu Ali");
  });
});

describe("experience length", () => {
  it("rounds to whole months, at least one", () => {
    expect(monthsBetween(new Date("2025-06-16"), new Date("2025-07-11"))).toBe(1);
    expect(monthsBetween(new Date("2025-06-16"), new Date("2025-06-17"))).toBe(1);
    expect(monthsBetween(new Date("2023-09-01"), new Date("2025-03-01"))).toBe(18);
    expect(splitMonths(18)).toEqual({ years: 1, months: 6 });
    expect(splitMonths(1)).toEqual({ years: 0, months: 1 });
  });
});
