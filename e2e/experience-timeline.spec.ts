import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./helpers/supabase";

/**
 * Experience timeline (phase 8): one column at every width, newest first, each entry with its
 * dates, length (calendar months, both ends included: "1 yıl 3 ay" / "1 yr 3 mos") and location;
 * "- " lines of the summary render as a list. Seed data: Atlas Yazılım (ongoing, bulleted),
 * Example Corp (June–July 2025: two months), Kuzey Mobil (all of 2024: one year).
 */

const entry = (page: Page, company: string) =>
  page.getByTestId("experience-entry").filter({ hasText: company });

for (const width of [375, 768, 1440]) {
  test(`one column, newest first at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/tr/experience");
    const entries = page.getByTestId("experience-entry");
    expect(await entries.count()).toBeGreaterThanOrEqual(3);
    const cards = await entries
      .locator("article")
      .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().x)));
    expect(new Set(cards).size, `card x positions ${cards}`).toBe(1);
    const starts = await entries.evaluateAll((nodes) =>
      nodes.map((node) => node.querySelector("time")!.getAttribute("datetime")!),
    );
    expect([...starts].sort().reverse()).toEqual(starts);
    // No horizontal page scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test("entries show dates, length and location; ongoing roles are marked", async ({ page }) => {
  await page.goto("/tr/experience");
  const example = entry(page, "Example Corp");
  await expect(example.getByTestId("experience-duration")).toHaveText("Süre: 2 ay");
  await expect(example.locator("time")).toHaveCount(2);
  await expect(entry(page, "Kuzey Mobil").getByTestId("experience-duration")).toHaveText(
    "Süre: 1 yıl",
  );
  await expect(entry(page, "Kuzey Mobil")).toContainText("İstanbul, Türkiye (uzaktan)");

  const atlas = entry(page, "Atlas Yazılım");
  await expect(atlas.locator("time")).toHaveCount(1);
  await expect(atlas.getByText("Devam ediyor")).toHaveCount(2); // date range and badge
  await expect(atlas.getByTestId("experience-duration")).toHaveText(
    /^Süre: (\d+ yıl)? ?(\d+ ay)?$/,
  );
  await expect(atlas).toContainText("İzmir, Türkiye");

  await page.goto("/en/experience");
  await expect(entry(page, "Kuzey Mobil").getByTestId("experience-duration")).toHaveText(
    "Duration: 1 yr",
  );
  await expect(entry(page, "Example Corp").getByTestId("experience-duration")).toHaveText(
    "Duration: 2 mos",
  );
  await expect(entry(page, "Atlas Yazılım")).toContainText("Izmir, Türkiye");
});

test("summary lines starting with a dash render as a list", async ({ page }) => {
  await page.goto("/tr/experience");
  const atlas = entry(page, "Atlas Yazılım");
  await expect(atlas.getByTestId("text-blocks").locator("li")).toHaveText([
    "Ödeme servisini yeniden yazdı",
    "OCPP 2.0.1 desteği ekledi",
    "Test kapsamını %40'tan %85'e çıkardı",
  ]);
  await expect(atlas.locator("article p", { hasText: /^Şarj/ })).toHaveText(
    "Şarj istasyonu yönetim platformunun arka uç ekibi.",
  );
  await expect(atlas).not.toContainText("- Ödeme");

  // The detail page shows the same summary and the length.
  await atlas.getByRole("link", { name: "Yazılım Mühendisi" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Yazılım" })).toBeVisible();
  await expect(page.getByTestId("text-blocks").locator("li:visible")).toHaveCount(3);
  await expect(page.getByTestId("experience-duration").filter({ visible: true })).toContainText(
    /Süre: /,
  );
});

test("the detail page shows the length in English", async ({ page }) => {
  const [example] = await sql<{ id: string }>(
    `SELECT id FROM public."Experience" WHERE company = 'Example Corp' LIMIT 1`,
  );
  await page.goto(`/en/experience/${example!.id}`);
  await expect(page.getByTestId("experience-duration")).toHaveText("· Duration: 2 mos");
  await expect(page.locator("main time")).toHaveCount(2);
  await expect(page.locator("main time").first()).toHaveAttribute("datetime", "2025-06");
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("the timeline passes axe", async ({ page }) => {
      const [atlas] = await sql<{ id: string }>(
        `SELECT id FROM public."Experience" WHERE company = 'Atlas Yazılım' LIMIT 1`,
      );
      for (const path of ["/tr/experience", "/en/experience", `/tr/experience/${atlas!.id}`]) {
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
