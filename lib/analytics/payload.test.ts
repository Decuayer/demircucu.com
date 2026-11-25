import { describe, expect, it } from "vitest";
import { trackPayload } from "./payload";

const id = "8f0b4f64-6a43-4e8c-9a39-2b3f5b0a1c11";

describe("trackPayload", () => {
  it("accepts the three beacon types", () => {
    expect(trackPayload.safeParse({ type: "view", id, path: "/tr" }).success).toBe(true);
    expect(
      trackPayload.safeParse({ type: "engagement", id, durationMs: 1200, scrollDepth: 40 }).success,
    ).toBe(true);
    expect(
      trackPayload.safeParse({
        type: "outbound",
        id,
        path: "/tr/projects/x",
        href: "https://github.com/x",
        target: "GITHUB",
      }).success,
    ).toBe(true);
  });

  it.each([
    { type: "view", id: "not-a-uuid", path: "/tr" },
    { type: "view", id, path: "tr" },
    { type: "view", id, path: `/${"a".repeat(600)}` },
    { type: "engagement", id, durationMs: -1, scrollDepth: 0 },
    { type: "engagement", id, durationMs: 1, scrollDepth: 101 },
    { type: "engagement", id, durationMs: 7 * 3_600_000, scrollDepth: 0 },
    { type: "outbound", id, path: "/tr", href: "https://x.y", target: "EVIL" },
    { type: "delete", id },
    null,
  ])("rejects %o", (payload) => {
    expect(trackPayload.safeParse(payload).success).toBe(false);
  });
});
