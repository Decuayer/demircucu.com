import { describe, expect, it } from "vitest";
import { absoluteUrl, getAppUrl } from "./app-url";

describe("getAppUrl", () => {
  it("prefers NEXT_PUBLIC_APP_URL", () => {
    expect(
      getAppUrl({
        NEXT_PUBLIC_APP_URL: "https://www.demircucu.com",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "app-git-feature.vercel.app",
      }).origin,
    ).toBe("https://www.demircucu.com");
  });

  it("uses the branch URL on preview deployments", () => {
    expect(
      getAppUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "app-git-feature-team.vercel.app",
        VERCEL_URL: "app-abc123-team.vercel.app",
      }).href,
    ).toBe("https://app-git-feature-team.vercel.app/");
  });

  it("falls back to VERCEL_URL on preview when there is no branch URL", () => {
    expect(getAppUrl({ VERCEL_ENV: "preview", VERCEL_URL: "app-abc123.vercel.app" }).origin).toBe(
      "https://app-abc123.vercel.app",
    );
  });

  it("uses the production domain in production", () => {
    expect(
      getAppUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "www.demircucu.com",
        VERCEL_URL: "app-xyz.vercel.app",
      }).origin,
    ).toBe("https://www.demircucu.com");
  });

  it("upgrades an http NEXT_PUBLIC_APP_URL to https on Vercel", () => {
    const env = { NEXT_PUBLIC_APP_URL: "http://www.example.com", VERCEL_ENV: "production" };
    expect(getAppUrl(env).toString()).toBe("https://www.example.com/");
    expect(getAppUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }).protocol).toBe("http:");
  });

  it("ignores a blank NEXT_PUBLIC_APP_URL", () => {
    expect(getAppUrl({ NEXT_PUBLIC_APP_URL: "  ", VERCEL_URL: "x.vercel.app" }).origin).toBe(
      "https://x.vercel.app",
    );
  });

  it("defaults to localhost", () => {
    expect(getAppUrl({}).origin).toBe("http://localhost:3000");
  });

  it("builds absolute URLs", () => {
    expect(
      absoluteUrl("/en/auth/callback?next=%2Fen", {
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "p.vercel.app",
      }),
    ).toBe("https://p.vercel.app/en/auth/callback?next=%2Fen");
  });
});
