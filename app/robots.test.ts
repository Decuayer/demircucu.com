import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it("allows public pages in production and points at the sitemap", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.demircucu.com");
    const result = robots();
    expect(result.rules).toMatchObject({
      allow: "/",
      disallow: ["/api/", "/*/admin", "/*/auth", "/*/profile"],
    });
    expect(result.sitemap).toBe("https://www.demircucu.com/sitemap.xml");
  });

  it("blocks everything outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.example.vercel.app");
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
