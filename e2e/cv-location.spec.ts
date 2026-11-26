import { expect, test, type Page } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Phase 8: the admin uploads a CV (PDF) in the settings and sets an experience location; the
 * public pages offer "Download CV" (falling back to the Turkish file on English pages) and show
 * the location. Restores both through the admin forms so cached pages are expired again.
 */

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

async function login(page: Page) {
  await clearRateLimits();
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
}

const cvPath = async () =>
  (
    await sql<{ cvPathTr: string | null }>(
      `SELECT "cvPathTr" FROM public."SiteSettings" WHERE id = 'main'`,
    )
  )[0]?.cvPathTr ?? null;

/** Saves the settings form and waits until the database has the expected CV path. */
async function saveSettings(page: Page, expected: RegExp | null) {
  await page.getByRole("button", { name: "Kaydet" }).first().click();
  await expect
    .poll(async () => {
      const path = await cvPath();
      return expected === null ? path === null : expected.test(path ?? "");
    })
    .toBe(true);
}

/** Public pages are cached; the save expires the tag, a reload may still race the expiry. */
async function expectEventually(page: Page, path: string, check: () => Promise<boolean>) {
  await expect
    .poll(
      async () => {
        await page.goto(path);
        return check();
      },
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
}

test("CV upload and experience location reach the public pages", async ({ page }) => {
  await login(page);

  // CV (Turkish only).
  await page.goto("/tr/admin/settings");
  await page.getByRole("tab", { name: "Hakkımda" }).click();
  await page.locator("#settings-cv-tr").setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(page.getByTestId("settings-cv-tr-name")).toHaveText(/\.pdf$/);
  await saveSettings(page, /^settings\/.+\.pdf$/);
  const settings = { cvPathTr: await cvPath() };

  const cvLink = (label: string) => page.locator("main").getByRole("link", { name: label });
  await expectEventually(page, "/tr/about", async () => (await cvLink("CV indir").count()) > 0);
  await expect(cvLink("CV indir")).toHaveAttribute("href", new RegExp(`${settings!.cvPathTr}$`));
  // No English file: the English page offers the Turkish one.
  await expectEventually(page, "/en/about", async () => (await cvLink("Download CV").count()) > 0);
  await expect(cvLink("Download CV")).toHaveAttribute("href", new RegExp(`${settings!.cvPathTr}$`));

  // Experience location.
  const [experience] = await sql<{ id: string }>(
    `SELECT id FROM public."Experience" WHERE published ORDER BY "createdAt" LIMIT 1`,
  );
  await page.goto(`/tr/admin/experiences/${experience!.id}/edit`);
  await page.locator("#experience-location-tr").fill("İzmir, Türkiye");
  await page.locator("form button[type=submit]").click();
  await expect(page.locator("[data-sonner-toast][data-type=success]").last()).toBeVisible();
  await expectEventually(page, "/tr/experience", async () =>
    page.locator("main").getByText("İzmir, Türkiye").isVisible(),
  );
  await expectEventually(page, `/en/experience/${experience!.id}`, async () =>
    page.locator("main").getByText("İzmir, Türkiye").isVisible(),
  );

  // Restore.
  await page.goto(`/tr/admin/experiences/${experience!.id}/edit`);
  await page.locator("#experience-location-tr").fill("");
  await page.locator("form button[type=submit]").click();
  await expect(page.locator("[data-sonner-toast][data-type=success]").last()).toBeVisible();
  await page.goto("/tr/admin/settings");
  await page.getByRole("tab", { name: "Hakkımda" }).click();
  await page
    .locator("#settings-cv-tr")
    .locator("..")
    .getByRole("button", { name: "Kaldır" })
    .click();
  await expect(page.getByTestId("settings-cv-tr-name")).toHaveText("Dosya seçilmedi");
  await saveSettings(page, null);
});
