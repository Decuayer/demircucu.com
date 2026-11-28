import { describe, expect, it } from "vitest";

import { hasText, stripGreeting, stripGreetings } from "./hero";
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

describe("stripGreetings", () => {
  it("removes each greeting in turn and keeps a plain name", () => {
    expect(stripGreetings("Hi, I'm Example", ["Hi, I'm", "Hello, I am"], "en")).toBe("Example");
    expect(stripGreetings("Hello, I am Example", ["Hi, I'm", "Hello, I am"], "en")).toBe("Example");
    expect(stripGreetings("Merhaba, ben Örnek", ["Merhaba, ben", "Merhaba, Ben"], "tr")).toBe(
      "Örnek",
    );
    expect(stripGreetings("  Örnek  ", ["Merhaba, ben"], "tr")).toBe("Örnek");
    expect(stripGreetings("", ["Hi, I'm"], "en")).toBe("");
  });
});

describe("hasText", () => {
  it("ignores markup and non-breaking spaces left by an emptied editor", () => {
    expect(hasText("<p>Merhaba</p>")).toBe(true);
    expect(hasText("<p></p>")).toBe(false);
    expect(hasText("<p>&nbsp;</p>  ")).toBe(false);
    expect(hasText("")).toBe(false);
    expect(hasText(null)).toBe(false);
  });
});
