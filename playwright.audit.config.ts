import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/**
 * Design audit (phase 8, task 4.1): screenshots at 1440 / 768 / 375, axe (WCAG 2.2 AA), console,
 * overflow, image, heading and focus checks. Public pages come from production (read-only GETs;
 * headless Chrome is treated as a bot by the analytics), admin / auth / profile pages from the
 * local E2E build (`npm run e2e:build`). Output: audit-screenshots/ (gitignored), then
 * `npx tsx scripts/design-audit-gallery.ts` builds audit-screenshots/index.html.
 *
 *   npx playwright test -c playwright.audit.config.ts
 */
export default defineConfig({
  ...base,
  testDir: "./audit",
  globalSetup: "./e2e/global-setup.ts",
  retries: 0,
  reporter: [["list"]],
  timeout: 180_000,
  use: { ...base.use, trace: "off", screenshot: "off" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "audit",
      testMatch: /design\.audit\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
