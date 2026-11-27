import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, clearRateLimits } from "./helpers/supabase";

/** Admin on phones (phase 8): the sidebar becomes a menu in a sheet. */

async function login(page: Page) {
  await clearRateLimits();
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
}

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the admin menu opens in a sheet, navigates and closes", async ({ page }) => {
    await login(page);
    await expect(page.getByTestId("admin-current-section")).toHaveText("Dashboard");
    const menu = page.getByRole("button", { name: "Admin menüsü" });
    await expect(menu).toBeVisible();

    await menu.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("navigation", { name: "Admin menüsü" })).toBeVisible();
    await sheet.getByRole("link", { name: "Projeler" }).click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("admin-current-section")).toHaveText("Projeler");

    // Keyboard: Escape closes the sheet and focus returns to the button.
    await menu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(menu).toBeFocused();

    for (const path of ["/tr/admin", "/tr/admin/projects"]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map((v) => v.id),
        path,
      ).toEqual([]);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test("on desktop the sidebar is shown and the mobile bar is not", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("button", { name: "Admin menüsü" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Admin menüsü" })).toBeVisible();
});
