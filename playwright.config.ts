import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// E2E runs target the local Supabase database (auth trigger, RLS), never .env.local values.
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Secret key of the local Supabase stack for the server's Storage uploads. `next start` reads
 * server-only variables at runtime, so the value used for the build is not enough.
 */
function localSecretKey(): string | undefined {
  if (process.env.E2E_BASE_URL) return undefined;
  if (process.env.SUPABASE_TEST_SECRET_KEY) return process.env.SUPABASE_TEST_SECRET_KEY;
  try {
    const out = execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
    return (JSON.parse(out.slice(out.indexOf("{"))) as Record<string, string>).SECRET_KEY;
  } catch {
    return undefined;
  }
}

/**
 * Expects the local Supabase stack (`npm run supabase:start`, migrated and seeded) and a
 * production build made with NEXT_PUBLIC_APP_URL=http://localhost:3100 (`npm run e2e:build`).
 * Browser matrix (WebKit, mobile viewports) and axe are added in later phases.
 */
export default defineConfig({
  testDir: "./e2e",
  // Local Supabase fixtures (admin account) are only needed when the suite starts its own server.
  globalSetup: process.env.E2E_BASE_URL ? undefined : "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    // Vercel Deployment Protection bypass for Preview runs (secret from CI, never committed).
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `${BASE_URL}/tr`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: E2E_DATABASE_URL,
          DIRECT_URL: E2E_DATABASE_URL,
          NEXT_PUBLIC_APP_URL: BASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: localSecretKey() ?? "",
        },
      },
});
