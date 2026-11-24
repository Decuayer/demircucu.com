import { describe, expect, it } from "vitest";
import { hasSupabaseAuthCookie, isProtectedPath, safeNextPath, splitLocale } from "./routes";

describe("splitLocale", () => {
  it.each([
    ["/tr/admin", { locale: "tr", path: "/admin" }],
    ["/en", { locale: "en", path: "/" }],
    ["/en/", { locale: "en", path: "/" }],
    ["/fr/admin", { locale: null, path: "/fr/admin" }],
  ])("%s", (input, expected) => {
    expect(splitLocale(input)).toEqual(expected);
  });
});

describe("isProtectedPath", () => {
  it.each(["/tr/admin", "/en/admin/projects", "/tr/profile", "/en/profile/likes"])(
    "protects %s",
    (path) => expect(isProtectedPath(path)).toBe(true),
  );
  it.each(["/tr", "/en/blog/admin", "/tr/administrator", "/en/auth/login", "/tr/profiles"])(
    "leaves %s public",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});

describe("hasSupabaseAuthCookie", () => {
  it("detects plain and chunked session cookies", () => {
    expect(hasSupabaseAuthCookie(["sb-abc-auth-token"])).toBe(true);
    expect(hasSupabaseAuthCookie(["NEXT_LOCALE", "sb-abc-auth-token.1"])).toBe(true);
    expect(hasSupabaseAuthCookie(["NEXT_LOCALE", "sb-abc-auth-token-code-verifier"])).toBe(false);
    expect(hasSupabaseAuthCookie([])).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/tr/auth/reset-password", "/tr/auth/reset-password"],
    ["/en/blog?x=1", "/en/blog?x=1"],
    ["https://evil.test/tr", "/tr"],
    ["//evil.test/tr", "/tr"],
    ["/\\evil.test", "/tr"],
    ["/fr/x", "/tr"],
    [null, "/tr"],
    ["javascript:alert(1)", "/tr"],
  ])("%s -> %s", (next, expected) => {
    expect(safeNextPath(next, "tr")).toBe(expected);
  });
});
