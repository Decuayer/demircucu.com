import { expect, test, type Page } from "@playwright/test";

/**
 * Read-your-own-writes on a deployed Preview (staging data): after an admin edit, the very first
 * request for the public page must already show the new title. No polling, unlike the local
 * `admin-cache.spec.ts`, whose `next start` server can answer the first request from the stale
 * build-time prerender.
 *
 * Needs E2E_BASE_URL and a staging admin (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, created with
 * scripts/staging-set-role.ts --create) and the seeded `sample-project`.
 */
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

test("admin edit is visible on the first public request (preview)", async ({ page }) => {
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
  await expect(page).toHaveURL(/\/tr\/admin$/);

  await page.goto("/tr/admin/projects");
  const card = page
    .locator("main div")
    .filter({ has: page.getByRole("heading", { name: original }) });
  const href = await card.locator('a[href$="/edit"]').first().getAttribute("href");
  expect(href).toBeTruthy();

  const newTitle = `Preview ${Date.now()}`;
  try {
    await setTitle(page, href!, newTitle);
    // Exactly one request per page: the first response must already be fresh.
    await page.goto(`/tr/projects/${SLUG}`);
    expect(await page.locator("main").innerText()).toContain(newTitle);
    await page.goto("/tr/projects");
    expect(await page.locator("main").innerText()).toContain(newTitle);
  } finally {
    await setTitle(page, href!, original);
  }
  await page.goto(`/tr/projects/${SLUG}`);
  expect(await page.locator("main").innerText()).toContain(original);
});
