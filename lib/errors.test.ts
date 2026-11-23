import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("reads Error messages", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("accepts thrown strings", () => {
    expect(getErrorMessage("plain")).toBe("plain");
  });

  it("uses the fallback for anything else", () => {
    expect(getErrorMessage({ message: 1 }, "fallback")).toBe("fallback");
    expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined)).toBe("");
  });
});
