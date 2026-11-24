import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// E2E runs target the local Supabase database (auth trigger, RLS), never .env.local values.
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Expects the local Supabase stack (`npm run supabase:start`, migrated and seeded) and a
 * production build made with NEXT_PUBLIC_APP_URL=http://localhost:3100 (`npm run e2e:build`).
 * Browser matrix (WebKit, mobile viewports) and axe are added in later phases.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
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
        },
      },
});
