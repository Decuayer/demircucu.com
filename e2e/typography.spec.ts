import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./helpers/supabase";

/**
 * Type scale and rhythm (phase 8): every public page title is on the same `h1` step (32px on a
 * phone, 48px from 1440px), the home hero on the `display` step (40 → 64px); article text keeps
 * 45–75 characters per line; prose headings sit closer to the text after them than before them.
 * Seed data: the long-form "typography-sample" post.
 */

const POST = "/tr/blog/typography-sample";

async function pagePaths(): Promise<string[]> {
  const [experience] = await sql<{ id: string }>(
    `SELECT id FROM public."Experience" WHERE published ORDER BY "startDate" DESC LIMIT 1`,
  );
  return [
    "/tr/about",
    "/tr/projects",
    "/tr/blog",
    "/tr/experience",
    "/tr/skills",
    "/tr/contact",
    "/tr/privacy",
    POST,
    "/en/projects/sample-project",
    `/tr/experience/${experience!.id}`,
    "/tr/skills/python",
  ];
}

const fontSize = (page: Page, selector: string) =>
  page
    .locator(selector)
    .filter({ visible: true })
    .first()
    .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));

for (const [width, h1, display] of [
  [375, 32, 40],
  [1440, 48, 64],
] as const) {
  test(`page titles share the h1 step at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of await pagePaths()) {
      await page.goto(path);
      expect(await fontSize(page, "main h1"), path).toBeCloseTo(h1, 0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} scrolls sideways`,
      ).toBeLessThanOrEqual(width);
    }
    await page.goto("/tr");
    expect(await fontSize(page, "main h1"), "home hero").toBeCloseTo(display, 0);
  });
}

/** Characters on the first line of each paragraph long enough to wrap. */
async function lineLengths(page: Page): Promise<number[]> {
  return page
    .getByTestId("prose")
    .filter({ visible: true })
    .first()
    .evaluate((prose) => {
      const lengths: number[] = [];
      for (const paragraph of prose.querySelectorAll(":scope > p")) {
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let top: number | null = null;
        let count = 0;
        let wrapped = false;
        for (let node = walker.nextNode(); node && !wrapped; node = walker.nextNode()) {
          const text = node.textContent ?? "";
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect) continue;
            top ??= rect.top;
            if (rect.top > top + 2) {
              wrapped = true;
              break;
            }
            count++;
          }
        }
        if (wrapped) lengths.push(count);
      }
      return lengths;
    });
}

test("article text keeps a readable line length and rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POST);
  const lengths = await lineLengths(page);
  expect(lengths.length).toBeGreaterThan(0);
  for (const length of lengths) {
    expect(length).toBeGreaterThanOrEqual(45);
    expect(length).toBeLessThanOrEqual(75);
  }

  const prose = page.getByTestId("prose").filter({ visible: true }).first();
  expect(await prose.evaluate((node) => getComputedStyle(node).fontSize)).toBe("17px");
  const heading = await prose
    .locator("h2")
    .nth(1)
    .evaluate((node) => {
      const style = getComputedStyle(node);
      return { top: parseFloat(style.marginTop), bottom: parseFloat(style.marginBottom) };
    });
  expect(heading.top).toBeGreaterThanOrEqual(heading.bottom * 2);

  // Links are underlined; wide tables scroll inside the column.
  await expect(prose.locator("a").first()).toHaveCSS("text-decoration-line", "underline");
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("pages with rich text pass axe", async ({ page }) => {
      for (const path of ["/tr", "/tr/about", POST, "/en/blog/typography-sample", "/tr/privacy"]) {
        await page.goto(path);
        // Streamed pages: let the content arrive before axe looks at it.
        await expect(page.locator("main h1").filter({ visible: true })).toHaveCount(1);
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
          .analyze();
        expect(
          result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
          `${path} (${scheme})`,
        ).toEqual([]);
      }
    });
  });
}
