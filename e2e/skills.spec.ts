import { expect, test } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Phase 4 tag system end to end: the skill tree, clickable chips, alias redirects, list filters
 * and creating a tag from the admin tag selector.
 */

test("skills page lists categories and links chips to the skill page", async ({ page }) => {
  await page.goto("/tr/skills");
  await expect(page.getByRole("heading", { level: 1, name: "Yetenekler" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Web Geliştirme" })).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: /^Next\.js/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tr\/skills\/nextjs$/);
  await expect(page.getByRole("heading", { level: 1, name: "Next.js" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Üst kategoriler" })).toContainText("Web");
});

test("an alias or other spelling redirects to the canonical skill page", async ({ page }) => {
  await page.goto("/en/skills/next-js");
  await expect(page).toHaveURL(/\/en\/skills\/nextjs$/);
});

test("blog list filters by tag", async ({ page }) => {
  await page.goto("/en/blog?tag=ai");
  await expect(page.getByText(/Filtered by/)).toBeVisible();
  await expect(
    page.locator("main").getByRole("link", { name: "Hello World" }).first(),
  ).toBeVisible();
});

test("project list filters by skill subtree and can be cleared", async ({ page }) => {
  await page.goto("/tr/projects?skill=web");
  await expect(page.getByText(/etiketiyle filtrelendi/)).toBeVisible();
  const filtered = await page.locator("main h2").count();
  expect(filtered).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Filtreyi kaldır" }).click();
  await expect(page).toHaveURL(/\/tr\/projects$/);
  await expect(page.getByText(/etiketiyle filtrelendi/)).toHaveCount(0);
});

test("admin creates a tag from the selector and it appears on the public page", async ({
  page,
}) => {
  await clearRateLimits();
  const run = Date.now().toString(36);
  const slug = `e2e-tags-${run}`;
  const tagName = `Elixir ${run}`;
  const tagSlug = `elixir-${run}`;
  const [project] = await sql<{ id: string }>(
    `INSERT INTO public."Project" (id, slug, "titleTr", "titleEn", "summaryTr", "summaryEn", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'Etiket testi', 'Tag test', 'Özet', 'Summary', now())
     RETURNING id`,
    [slug],
  );

  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);

  try {
    await page.goto(`/tr/admin/projects/${project!.id}/edit`);
    await page.waitForLoadState("networkidle");
    const search = page.getByPlaceholder("Etiket ara (ad, slug veya alias)");
    // Existing tag found through an alias.
    await search.fill("next-js");
    await page.getByRole("option", { name: /Next\.js/ }).click();
    // New tag through the create dialog.
    await search.fill(tagName);
    await page.getByRole("option", { name: `"${tagName}" etiketini oluştur` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Ad", { exact: true })).toHaveValue(tagName);
    await dialog.getByRole("button", { name: "Oluştur" }).click();
    await expect(page.getByRole("list", { name: "Seçili etiketler" })).toContainText(tagName);
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);

    const rows = await sql<{ slug: string; source: string }>(
      `SELECT t.slug, pt.source FROM public."ProjectTag" pt JOIN public."Tag" t ON t.id = pt."tagId"
       WHERE pt."projectId" = $1 ORDER BY t.slug`,
      [project!.id],
    );
    expect(rows).toEqual([
      { slug: tagSlug, source: "MANUAL" },
      { slug: "nextjs", source: "MANUAL" },
    ]);

    await expect
      .poll(
        async () => {
          await page.goto(`/tr/projects/${slug}`);
          return page
            .getByRole("link", { name: tagName })
            .getAttribute("href")
            .catch(() => null);
        },
        { timeout: 15_000, intervals: [250, 500, 1000] },
      )
      .toBe(`/tr/skills/${tagSlug}`);
  } finally {
    await sql(`DELETE FROM public."Project" WHERE id = $1`, [project!.id]);
    await sql(`DELETE FROM public."Tag" WHERE slug = $1`, [tagSlug]);
  }
});
