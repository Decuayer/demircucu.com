import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const h = (init: Record<string, string>) => new Headers(init);

describe("isSameOrigin", () => {
  it("accepts a matching origin", () => {
    expect(isSameOrigin(h({ origin: "https://demircucu.com", host: "demircucu.com" }))).toBe(true);
    expect(
      isSameOrigin(
        h({ origin: "https://p.vercel.app", host: "internal", "x-forwarded-host": "p.vercel.app" }),
      ),
    ).toBe(true);
  });

  it.each([
    [{ host: "demircucu.com" }],
    [{ origin: "https://evil.test", host: "demircucu.com" }],
    [{ origin: "null", host: "demircucu.com" }],
    [{ origin: "https://demircucu.com.evil.test", host: "demircucu.com" }],
    [{ origin: "https://demircucu.com" }],
  ])("rejects %o", (headers) => {
    expect(isSameOrigin(h(headers))).toBe(false);
  });
});
