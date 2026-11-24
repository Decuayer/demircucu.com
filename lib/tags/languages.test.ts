import { describe, expect, it } from "vitest";
import { selectRepoLanguages } from "./languages";

describe("selectRepoLanguages", () => {
  it("keeps the primary language and others at or above 10%", () => {
    expect(
      selectRepoLanguages("TypeScript", { TypeScript: 800, CSS: 100, JavaScript: 90, HTML: 10 }),
    ).toEqual(["TypeScript", "CSS"]);
  });

  it("keeps the primary language even below the threshold", () => {
    expect(selectRepoLanguages("C", { Python: 950, C: 50 })).toEqual(["C", "Python"]);
  });

  it("drops build and markup languages", () => {
    expect(
      selectRepoLanguages("TeX", { TeX: 500, Python: 400, Makefile: 100, Dockerfile: 100 }),
    ).toEqual(["Python"]);
  });

  it("handles missing data", () => {
    expect(selectRepoLanguages(null, null)).toEqual([]);
    expect(selectRepoLanguages("Swift", undefined)).toEqual(["Swift"]);
    expect(selectRepoLanguages(undefined, { Go: 0 })).toEqual([]);
  });

  it("does not repeat a language", () => {
    expect(selectRepoLanguages("Python", { Python: 10, "Jupyter Notebook": 90 })).toEqual([
      "Python",
      "Jupyter Notebook",
    ]);
  });
});
