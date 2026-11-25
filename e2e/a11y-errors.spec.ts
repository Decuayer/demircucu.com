import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Phase 8 fixes from the design audit (docs/design-audit.md): accessible names, form labels,
 * the localized 404 / error pages, the skip link and admin dates without hydration errors.
 */

// Rules the audit found and this phase fixed; other rules (contrast, heading order) follow with
// the design changes.
const FIXED_RULES = [
  "button-name",
  "link-name",
  "label",
  "aria-input-field-name",
  "aria-toggle-field-name",
  "aria-valid-attr-value",
  "html-has-lang",
  "landmark-unique",
  "landmark-one-main",
  "scrollable-region-focusable",
];

async function violations(page: Page) {
  const result = await new AxeBuilder({ page }).withRules(FIXED_RULES).analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
}

async function login(page: Page) {
  await clearRateLimits();
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
}

test.describe("404 pages", () => {
  for (const [path, lang, title] of [
    ["/tr/bu-sayfa-yok", "tr", "Sayfa bulunamadı"],
    ["/en/no/such/page", "en", "Page not found"],
    ["/en/projects/no-such-project", "en", "Page not found"],
    ["/tr/blog/olmayan-yazi", "tr", "Sayfa bulunamadı"],
  ] as const) {
    test(`${path} renders the localized 404 in the site layout`, async ({ page }) => {
      const response = await page.goto(path);
      // Unknown slugs of prerendered routes may answer 200 + noindex first (soft 404, smoke.spec).
      expect([200, 404]).toContain(response?.status());
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      // Next.js may emit the tag twice (404 status and not-found boundary); one is enough.
      await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }
});

test("the skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/tr/about");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "İçeriğe geç" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the menu button has a name and public pages pass the fixed rules", async ({ page }) => {
    await page.goto("/tr");
    const menu = page.getByRole("button", { name: "Menüyü aç" });
    await expect(menu).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await menu.click();
    await expect(
      page.getByRole("dialog").getByRole("navigation", { name: "Ana gezinme" }),
    ).toBeVisible();
    for (const path of ["/en/projects", "/tr/projects/sample-project", "/tr/auth/login"]) {
      await page.goto(path);
      expect(await violations(page), path).toEqual([]);
    }
  });
});

test.describe("admin", () => {
  // A browser in another time zone and locale than the server (UTC): dates must still hydrate.
  test.use({ timezoneId: "America/Los_Angeles", locale: "en-US" });

  test("admin pages have named controls, labelled fields and no hydration errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page);
    const [post] = await sql<{ id: string }>(
      `SELECT id FROM public."BlogPost" WHERE slug = 'hello-world'`,
    );
    const [project] = await sql<{ id: string }>(
      `SELECT id FROM public."Project" WHERE slug = 'sample-project'`,
    );
    for (const path of [
      "/tr/admin/blog",
      "/tr/admin/comments",
      "/tr/admin/contacts",
      "/tr/admin/media",
      "/tr/admin/experiences",
      "/tr/admin/projects",
      `/tr/admin/projects/${project!.id}/edit`,
      `/tr/admin/blog/${post!.id}/edit`,
      "/tr/admin/experiences/new",
      "/tr/admin/settings",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await violations(page), path).toEqual([]);
    }
    expect(errors.filter((message) => message.includes("418"))).toEqual([]);

    // The editor toolbar is labelled and reports its state.
    await page.goto(`/tr/admin/blog/${post!.id}/edit`);
    const bold = page.getByRole("toolbar").first().getByRole("button", { name: "Kalın" });
    await expect(bold).toHaveAttribute("aria-pressed", "false");
    // The rich text area is named after its field ("… (TR)"; text inputs end with " *").
    await expect(page.getByRole("textbox", { name: /\(TR\)$/ })).toBeVisible();
  });
});
