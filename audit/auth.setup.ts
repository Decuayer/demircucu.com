import { expect, test } from "@playwright/test";
import { ADMIN, clearRateLimits } from "../e2e/helpers/supabase";
import { AUTH_STATE } from "./pages";

test("sign in as the local admin", async ({ page }) => {
  await clearRateLimits();
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
  await page.context().storageState({ path: AUTH_STATE });
});
