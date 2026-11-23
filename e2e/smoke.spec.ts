import { expect, test } from "@playwright/test";

const PUBLIC_PATHS = ["/", "/about", "/experience", "/projects", "/blog", "/contact"];
const LOCALES = ["tr", "en"] as const;

for (const locale of LOCALES) {
  for (const path of PUBLIC_PATHS) {
    test(`${locale}${path} renders without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const response = await page.goto(`/${locale}${path === "/" ? "" : path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main")).toBeVisible();
      expect(consoleErrors).toEqual([]);
    });
  }
}

for (const [browserLocale, expected] of [
  ["tr-TR", "tr"],
  ["en-US", "en"],
] as const) {
  test.describe(`browser language ${browserLocale}`, () => {
    test.use({ locale: browserLocale });

    test(`root redirects to /${expected}`, async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${expected}/?$`));
    });
  });
}

test("unknown project slug returns 404", async ({ page }) => {
  const response = await page.goto("/tr/projects/does-not-exist");
  expect(response?.status()).toBe(404);
});
