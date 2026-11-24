import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ADMIN, clearRateLimits, deleteMail, linkFromMail } from "./helpers/supabase";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearRateLimits();
});

test("anonymous visitors are sent to login and back", async ({ page }) => {
  await page.goto("/tr/admin");
  await expect(page).toHaveURL(/\/tr\/auth\/login\?next=%2Ftr%2Fadmin/);
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
});

test("wrong credentials give one generic message", async ({ page }) => {
  await page.goto("/en/auth/login");
  for (const email of [ADMIN.email, `nobody-${randomUUID()}@example.test`]) {
    await page.locator("main").getByLabel("Email").fill(email);
    await page.locator("main").getByLabel("Password").fill("Wrong-Password-1");
    await page.locator("main").getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Incorrect e-mail or password.",
    );
  }
});

test("open redirects through ?next are ignored", async ({ page }) => {
  await page.goto("/en/auth/login?next=https://evil.test/en");
  await page.locator("main").getByLabel("Email").fill(ADMIN.email);
  await page.locator("main").getByLabel("Password").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/en$/);
});

test("register, verify e-mail, then reset the password", async ({ page }) => {
  await deleteMail();
  const email = `e2e-${randomUUID()}@example.test`;

  await page.goto("/en/auth/register");
  await page.locator("main").getByLabel("Full Name").fill("E2E User");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.locator("main").getByLabel("Password", { exact: true }).fill("short");
  await page.locator("main").getByLabel("Confirm Password").fill("short");
  await page.locator("main").getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByText("Password must be at least 10 characters.")).toBeVisible();

  await page.locator("main").getByLabel("Password", { exact: true }).fill("E2e-User-Pass-1");
  await page.locator("main").getByLabel("Confirm Password").fill("E2e-User-Pass-1");
  await page.locator("main").getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  await expect(page.locator("main").getByLabel("Email")).toHaveValue(email);

  // Unconfirmed accounts cannot sign in yet.
  await page.goto("/en/auth/login");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.locator("main").getByLabel("Password").fill("E2e-User-Pass-1");
  await page.locator("main").getByRole("button", { name: "Sign In" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("not verified");

  await page.goto(await linkFromMail(email, "type=email"));
  await expect(page).toHaveURL(/\/en\/auth\/confirmed$/);
  await expect(page.getByRole("heading", { name: "E-mail verified" })).toBeVisible();

  // Forgot password -> e-mailed link -> recovery session -> new password.
  await page.context().clearCookies();
  await deleteMail();
  await page.goto("/en/auth/forgot-password");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("If an account exists");

  await page.goto(await linkFromMail(email, "type=recovery"));
  await expect(page).toHaveURL(/\/en\/auth\/reset-password$/);
  await page.locator("main").getByLabel("New password").fill("E2e-User-Pass-2");
  await page.locator("main").getByLabel("Confirm Password").fill("E2e-User-Pass-2");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/en$/);

  await page.context().clearCookies();
  await page.goto("/en/auth/login");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.locator("main").getByLabel("Password").fill("E2e-User-Pass-2");
  await page.locator("main").getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();
});

test("invalid callback links land on login with a message", async ({ page }) => {
  await page.goto("/tr/auth/callback?token_hash=bogus&type=recovery&next=/tr/auth/reset-password");
  await expect(page).toHaveURL(/\/tr\/auth\/login\?error=callback$/);
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
});
