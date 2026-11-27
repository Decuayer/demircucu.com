import { describe, expect, it } from "vitest";
import { readingMinutes } from "./reading-time";

describe("readingMinutes", () => {
  it("counts words, not markup", () => {
    const words = Array.from({ length: 401 }, (_, i) => `kelime${i}`).join(" ");
    expect(readingMinutes(`<p class="a very long attribute list">${words}</p>`)).toBe(3);
    expect(readingMinutes(`<img src="${"x".repeat(5000)}"><p>Kısa yazı.</p>`)).toBe(1);
    expect(readingMinutes("<p>&nbsp;&amp;</p>")).toBe(1);
    expect(readingMinutes(null)).toBe(1);
  });
});
