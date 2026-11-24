import { expect, test, type Page } from "@playwright/test";

/**
 * Admin edits on a deployed Preview (staging data) must reach the cached public pages quickly
 * and for good.
 *
 * On Vercel a tag expiry needs ~2-3 s to reach every instance's shared cache. A request in that
 * window (often the client router prefetching a public link right after the save) can regenerate
 * the page from stale data. Before the fix that page then stayed at the CDN until `cacheLife`
 * ended (> 70 s observed, i.e. hours); now `invalidate()` expires the tags again after SETTLE_MS
 * (lib/cache/tags.ts). The test allows that window and fails on lasting staleness.
 *
 * Needs E2E_BASE_URL and a staging admin (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, created with
 * scripts/staging-set-role.ts --create) and the seeded `sample-project`.
 */
const FRESH_WITHIN_MS = 15_000;
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const SLUG = "sample-project";

test.skip(
  !process.env.E2E_BASE_URL || !email || !password,
  "Preview only: needs E2E_BASE_URL and staging admin credentials",
);

async function setTitle(page: Page, editUrl: string, title: string): Promise<void> {
  await page.goto(editUrl);
  await page
    .locator("main")
    .getByLabel(/\(TR\)/)
    .first()
    .fill(title);
  await page.locator("form button[type=submit]").click();
  await expect(page).toHaveURL(/\/tr\/admin\/projects$/, { timeout: 30_000 });
}

test("admin edit reaches the cached public pages within seconds (preview)", async ({ page }) => {
  // Warm every cache entry the edit must expire.
  expect((await page.goto(`/tr/projects/${SLUG}`))?.status()).toBe(200);
  const original = (await page.locator("main h1").first().innerText()).trim();
  for (const path of ["/tr/projects", "/en/projects"]) {
    expect((await page.goto(path))?.status()).toBe(200);
  }

  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(email!);
  await page.locator("main").getByLabel("Şifre").fill(password!);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/, { timeout: 30_000 });

  await page.goto("/tr/admin/projects");
  const card = page
    .locator("main div")
    .filter({ has: page.getByRole("heading", { name: original }) });
  const href = await card.locator('a[href$="/edit"]').first().getAttribute("href");
  expect(href).toBeTruthy();

  const newTitle = `Preview ${Date.now()}`;
  try {
    await setTitle(page, href!, newTitle);
    for (const path of [`/tr/projects/${SLUG}`, "/tr/projects", "/en/projects"]) {
      const expected = path.startsWith("/en") ? null : newTitle;
      await expect
        .poll(
          async () => {
            await page.goto(path);
            return page.locator("main").innerText();
          },
          { timeout: FRESH_WITHIN_MS, intervals: [500, 1000, 2000] },
        )
        .toContain(expected ?? "Sample Project");
    }
    // Still fresh after the follow-up expiry has run.
    await page.waitForTimeout(6_000);
    await page.goto("/tr/projects");
    expect(await page.locator("main").innerText()).toContain(newTitle);
  } finally {
    await setTitle(page, href!, original);
  }
  await expect
    .poll(
      async () => {
        await page.goto("/tr/projects");
        return page.locator("main").innerText();
      },
      { timeout: FRESH_WITHIN_MS, intervals: [500, 1000, 2000] },
    )
    .not.toContain(newTitle);
});
