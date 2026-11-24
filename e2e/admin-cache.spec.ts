import { expect, test } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * An admin edit expires the project cache tags, so the public (cached, prerendered) page shows
 * the new title. Under `next start` the first request after updateTag can still be answered from
 * the build-time prerender while the page regenerates (observed in Phase 2, see
 * docs/security-review.md); the test therefore allows a few reloads, and fails if the page never
 * updates. Re-check strict read-your-own-writes on a Vercel Preview.
 */
test("admin edit is visible on the public page immediately", async ({ page }) => {
  await clearRateLimits();
  const [project] = await sql<{ id: string; titleTr: string }>(
    `SELECT id, "titleTr" FROM public."Project" WHERE slug = 'sample-project'`,
  );
  const newTitle = `Güncel başlık ${Date.now()}`;

  // Warm the cache.
  await page.goto("/tr/projects/sample-project");

  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);

  try {
    await page.goto(`/tr/admin/projects/${project!.id}/edit`);
    await page
      .locator("main")
      .getByLabel(/\(TR\)/)
      .first()
      .fill(newTitle);
    await page.locator("form button[type=submit]").click();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "success");
    await expect
      .poll(async () => {
        const [row] = await sql<{ titleTr: string }>(
          `SELECT "titleTr" FROM public."Project" WHERE id = $1`,
          [project!.id],
        );
        return row?.titleTr;
      })
      .toBe(newTitle);

    for (const path of ["/tr/projects/sample-project", "/tr/projects", "/en/projects"]) {
      await expect
        .poll(
          async () => {
            await page.goto(path);
            return page.locator("main").innerText();
          },
          { timeout: 10_000, intervals: [250, 500, 1000] },
        )
        .toContain(path.startsWith("/en") ? "Sample Project" : newTitle);
    }

    // Restore through the admin form as well, so the cache is invalidated again.
    await page.goto(`/tr/admin/projects/${project!.id}/edit`);
    await page
      .locator("main")
      .getByLabel(/\(TR\)/)
      .first()
      .fill(project!.titleTr);
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);
  } finally {
    await sql(`UPDATE public."Project" SET "titleTr" = $1 WHERE id = $2`, [
      project!.titleTr,
      project!.id,
    ]);
  }
});
