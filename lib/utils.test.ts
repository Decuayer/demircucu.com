import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("treats the type scale as font sizes, not colours", () => {
    expect(cn("text-lead text-muted-foreground")).toBe("text-lead text-muted-foreground");
    expect(cn("text-h2 text-link", "text-h3")).toBe("text-link text-h3");
    expect(cn("text-sm", "text-eyebrow")).toBe("text-eyebrow");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});
