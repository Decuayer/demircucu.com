import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "./headers";

const parse = (policy: string) =>
  Object.fromEntries(
    policy.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values];
    }),
  );

const prod = {
  supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  isDev: false,
  isPreview: false,
};

describe("buildContentSecurityPolicy", () => {
  it("locks down production", () => {
    const csp = parse(buildContentSecurityPolicy(prod));
    expect(csp["default-src"]).toEqual(["'self'"]);
    expect(csp["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["frame-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
    expect(csp["upgrade-insecure-requests"]).toEqual([]);
  });

  it("allows only the project's own Supabase origin, not a wildcard", () => {
    const csp = parse(buildContentSecurityPolicy(prod));
    expect(csp["img-src"]).toContain("https://abcdefghijklmnopqrst.supabase.co");
    expect(csp["connect-src"]).toEqual(["'self'", "https://abcdefghijklmnopqrst.supabase.co"]);
    expect(buildContentSecurityPolicy(prod)).not.toContain("*.supabase.co");
  });

  it("never allows eval or the Vercel toolbar in production", () => {
    const policy = buildContentSecurityPolicy(prod);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("vercel.live");
  });

  it("adds the Vercel toolbar on previews", () => {
    const csp = parse(buildContentSecurityPolicy({ ...prod, isPreview: true }));
    expect(csp["script-src"]).toContain("https://vercel.live");
    expect(csp["frame-src"]).toEqual(["https://vercel.live"]);
  });

  it("allows eval and HMR websockets in development only", () => {
    const csp = parse(buildContentSecurityPolicy({ ...prod, isDev: true }));
    expect(csp["script-src"]).toContain("'unsafe-eval'");
    expect(csp["connect-src"]).toContain("ws:");
    expect(csp["upgrade-insecure-requests"]).toBeUndefined();
  });

  it("tolerates a missing Supabase URL", () => {
    expect(() => buildContentSecurityPolicy({ isDev: false, isPreview: false })).not.toThrow();
  });
});

describe("buildSecurityHeaders", () => {
  it("sets the hardening headers", () => {
    const headers = Object.fromEntries(buildSecurityHeaders(prod).map((h) => [h.key, h.value]));
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=63072000/);
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("omits HSTS in development", () => {
    const keys = buildSecurityHeaders({ ...prod, isDev: true }).map((h) => h.key);
    expect(keys).not.toContain("Strict-Transport-Security");
  });
});
