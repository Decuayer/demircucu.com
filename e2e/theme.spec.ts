import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./helpers/supabase";

/**
 * Light / dark / system theme (next-themes) and the contrast and heading fixes of phase 8.
 * "First frame" is the theme class on <html> in the first animation frame, recorded by an init
 * script: if it is already right, the page never flashes the other theme.
 */

async function recordFirstFrame(page: Page) {
  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as unknown as { __firstFrame: string }).__firstFrame =
        document.documentElement.className;
    });
  });
}

const firstFrame = (page: Page) =>
  page
    .waitForFunction(() => (window as unknown as { __firstFrame?: string }).__firstFrame)
    .then((handle) => handle.jsonValue() as Promise<string>);

/** Body background as rgb (Chromium reports oklch tokens in lab()); painted via a canvas. */
const background = (page: Page) =>
  page.evaluate(() => {
    const context = document.createElement("canvas").getContext("2d")!;
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  });

for (const scheme of ["light", "dark"] as const) {
  test.describe(`system ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("follows the system theme from the first frame", async ({ page }) => {
      await recordFirstFrame(page);
      await page.goto("/tr");
      expect(await firstFrame(page)).toContain(scheme);
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${scheme}\\b`));
      expect(await background(page)).toBe(
        scheme === "light" ? "rgb(255, 255, 255)" : "rgb(9, 9, 11)",
      );
    });

    test("pages meet contrast and heading order", async ({ page }) => {
      const [github] = await sql<{ slug: string }>(
        `SELECT slug FROM public."Project" WHERE published AND "readmeHtml" IS NOT NULL LIMIT 1`,
      );
      const paths = ["/tr", "/en/projects", "/tr/blog", "/tr/contact", "/tr/bu-sayfa-yok"];
      if (github) paths.push(`/tr/projects/${github.slug}`);
      for (const path of paths) {
        await page.goto(path);
        const result = await new AxeBuilder({ page })
          .withRules(["color-contrast", "heading-order"])
          .analyze();
        expect(
          result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
          `${path} (${scheme})`,
        ).toEqual([]);
      }
    });
  });
}

test.describe("theme menu", () => {
  test.use({ colorScheme: "light" });

  test("a chosen theme overrides the system and survives a reload without a flash", async ({
    page,
  }) => {
    await recordFirstFrame(page);
    await page.goto("/tr/about");
    await page.getByRole("button", { name: "Tema" }).click();
    await page.getByRole("menuitemradio", { name: "Koyu" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

    await page.reload();
    expect(await firstFrame(page)).toContain("dark");

    await page.getByRole("button", { name: "Tema" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Koyu" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("menuitemradio", { name: "Sistem" }).click();
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
  });
});
