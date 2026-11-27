import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Home page (phase 8, decision 4a): short hero with one greeting, featured projects in a grid
 * that leaves no empty column, recent experience, featured skills and the newest posts by date.
 */

test("the hero greets once and the old call-to-action box is gone", async ({ page }) => {
  await page.goto("/tr");
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  expect((await h1.innerText()).match(/merhaba/gi)).toHaveLength(1);
  await expect(page.getByRole("link", { name: /Benimle İletişime Geç/ }).first()).toBeVisible();
  await expect(page.getByText("Birlikte Çalışalım")).toHaveCount(0);
});

for (const width of [1440, 768, 375]) {
  test(`featured projects leave no empty column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tr");
    const items = page.getByTestId("home-projects").locator(":scope > li");
    const count = await items.count();
    test.skip(count === 0, "no featured projects in this database");
    const xs = new Set<number>();
    for (let i = 0; i < count; i++) xs.add(Math.round((await items.nth(i).boundingBox())!.x));
    const columns = xs.size;
    // Every row is full: the item count is a multiple of the column count.
    expect(count % columns, `${count} items in ${columns} columns`).toBe(0);
  });
}

test("posts are listed newest first and skills link to their pages", async ({ page }) => {
  await page.goto("/tr");
  const dates = await page
    .getByTestId("home-posts")
    .locator("time")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("datetime") ?? ""));
  expect(dates.length).toBeLessThanOrEqual(3);
  expect([...dates].sort().reverse()).toEqual(dates);

  const skills = page.getByTestId("home-skills").getByRole("link");
  if ((await skills.count()) > 0) {
    await expect(skills.first()).toHaveAttribute("href", /\/tr\/skills\//);
  }
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("the home page passes axe", async ({ page }) => {
      for (const path of ["/tr", "/en"]) {
        await page.goto(path);
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
