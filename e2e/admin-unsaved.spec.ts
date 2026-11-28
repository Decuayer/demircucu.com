import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Unsaved-changes warning (phase 8, decision 9a): a changed admin form shows an "unsaved" badge;
 * leaving through a link or its own cancel asks first, reloading or closing gets the browser's
 * prompt, saving clears it. Untouched forms never ask. The browser's back button is not held;
 * the kept page (Activity) still has the values on return.
 */

async function login(page: Page) {
  await clearRateLimits();
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
}

async function openPostForm(page: Page) {
  const [post] = await sql<{ id: string }>(
    `SELECT id FROM public."BlogPost" WHERE slug = 'hello-world'`,
  );
  // Opened from the list like a person would: an in-app navigation, so back / forward stay
  // inside the app (a full page load per step would be a new document each time).
  await page.goto("/tr/admin/blog");
  await page.locator(`a[href$="/admin/blog/${post!.id}/edit"]`).click();
  await expect(page).toHaveURL(/\/edit$/);
  const title = page.getByLabel("Yazı Başlığı (EN) *");
  await expect(title).toHaveValue("Hello World");
  return title;
}

const sidebar = (page: Page) => page.getByRole("navigation", { name: "Admin menüsü" });
const dialog = (page: Page) => page.getByRole("alertdialog");

test("an untouched form leaves without asking", async ({ page }) => {
  await login(page);
  await openPostForm(page);
  await expect(page.getByTestId("unsaved-badge")).toHaveCount(0);
  await sidebar(page).getByRole("link", { name: "Projeler" }).click();
  await expect(page).toHaveURL(/\/tr\/admin\/projects$/);
  await expect(dialog(page)).toHaveCount(0);
});

test("a changed form asks before a link or its cancel, and staying keeps the values", async ({
  page,
}) => {
  await login(page);
  const title = await openPostForm(page);
  await title.fill("Hello World, edited");
  await expect(page.getByTestId("unsaved-badge")).toHaveText("Kaydedilmemiş değişiklikler");

  // Changing it back makes the form clean again.
  await title.fill("Hello World");
  await expect(page.getByTestId("unsaved-badge")).toHaveCount(0);
  await title.fill("Hello World, edited");

  await sidebar(page).getByRole("link", { name: "Projeler" }).click();
  await expect(dialog(page)).toContainText("Kaydedilmemiş değişiklikler var");
  await expect(dialog(page).getByRole("button", { name: "Sayfada kal" })).toBeFocused();
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const result = await new AxeBuilder({ page })
      .include('[data-testid="unsaved-dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => `${n.target} ${n.failureSummary}`).join(" | ")}`,
      ),
      scheme,
    ).toEqual([]);
  }
  await dialog(page).getByRole("button", { name: "Sayfada kal" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/edit$/);
  await expect(title).toHaveValue("Hello World, edited");

  // The site header's links are held too.
  await page.getByRole("banner").getByRole("link", { name: "Blog" }).first().click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/edit$/);

  await page.getByRole("button", { name: "İptal" }).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Kaydetmeden çık" }).click();
  await expect(page).toHaveURL(/\/tr\/admin\/blog$/);
});

test("reloading or closing a changed form gets the browser's prompt", async ({ page }) => {
  await login(page);
  const title = await openPostForm(page);
  await title.fill("Hello World, edited");
  const prompt = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const shown = await prompt;
  expect(shown.type()).toBe("beforeunload");
  await shown.accept();
});

test("the back button leaves, and the form still has the values on return", async ({ page }) => {
  await login(page);
  const title = await openPostForm(page);
  await title.fill("Hello World, kept");
  await page.goBack();
  await expect(page).toHaveURL(/\/tr\/admin\/blog$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel("Yazı Başlığı (EN) *")).toHaveValue("Hello World, kept");
  await expect(page.getByTestId("unsaved-badge")).toBeVisible();
});

test("saving settings clears the warning", async ({ page }) => {
  const [before] = await sql<{ footerDescriptionEn: string | null }>(
    `SELECT "footerDescriptionEn" FROM public."SiteSettings" LIMIT 1`,
  );
  await login(page);
  try {
    await page.goto("/tr/admin/settings");
    const field = page.getByLabel("Footer Açıklama (EN)");
    await field.fill(`E2E footer ${Date.now()}`);
    await expect(page.getByTestId("unsaved-badge")).toBeVisible();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Ayarlar başarıyla kaydedildi!")).toBeVisible();
    await expect(page.getByTestId("unsaved-badge")).toHaveCount(0);
    await sidebar(page).getByRole("link", { name: "Projeler" }).click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);
    await expect(dialog(page)).toHaveCount(0);
  } finally {
    await sql(`UPDATE public."SiteSettings" SET "footerDescriptionEn" = $1`, [
      before?.footerDescriptionEn ?? null,
    ]);
  }
});

test("the tag editor asks before another tag replaces its changes", async ({ page }) => {
  const [before] = await sql<{ descriptionEn: string | null }>(
    `SELECT "descriptionEn" FROM public."Tag" WHERE slug = 'typescript'`,
  );
  await login(page);
  try {
    await page.goto("/tr/admin/tags");
    const pick = (name: string) =>
      page.locator("li").filter({ hasText: name }).getByRole("button").first().click();
    await pick("TypeScript");
    const description = page.getByLabel("Açıklama (EN)");
    await description.fill("Typed JavaScript (E2E)");
    await expect(page.getByTestId("unsaved-badge")).toBeVisible();

    await pick("Python");
    await dialog(page).getByRole("button", { name: "Sayfada kal" }).click();
    await expect(description).toHaveValue("Typed JavaScript (E2E)");

    // Saving clears it; switching no longer asks.
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText("Etiket kaydedildi.")).toBeVisible();
    await expect(page.getByTestId("unsaved-badge")).toHaveCount(0);
    await pick("Python");
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByLabel("Açıklama (EN)")).not.toHaveValue("Typed JavaScript (E2E)");

    // A discarded change: the next tag opens.
    await page.getByLabel("Açıklama (EN)").fill("Changed");
    await pick("TypeScript");
    await dialog(page).getByRole("button", { name: "Kaydetmeden çık" }).click();
    await expect(page.getByLabel("Açıklama (EN)")).toHaveValue("Typed JavaScript (E2E)");
    await expect(page.getByTestId("unsaved-badge")).toHaveCount(0);
  } finally {
    await sql(`UPDATE public."Tag" SET "descriptionEn" = $1 WHERE slug = 'typescript'`, [
      before?.descriptionEn ?? null,
    ]);
  }
});
