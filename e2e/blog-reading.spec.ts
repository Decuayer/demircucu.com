import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Blog reading features (phase 8): table of contents (beside the article from 1280px, a
 * collapsible block below), reading progress, previous / next post and share links; public
 * pages take their interface text from the messages. Seed data: "typography-sample" (three
 * headings and more) between the older "short-notes" (two headings) and "hello-world".
 */

const POST = "/tr/blog/typography-sample";

const visible = (page: Page, testId: string) =>
  page.getByTestId(testId).filter({ visible: true }).first();

test("the table of contents sits beside the article and follows the reader", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POST);
  const toc = page.getByTestId("toc-sidebar").filter({ visible: true });
  await expect(toc).toHaveCount(1);
  await expect(page.getByTestId("toc-details").filter({ visible: true })).toHaveCount(0);
  await expect(toc.getByRole("link")).toHaveText([
    "Ölçek ve ritim",
    "Boşluk adımları",
    "Kod ve tablolar",
  ]);

  // In the free space to the right of the text column.
  const prose = (await visible(page, "prose").boundingBox())!;
  const box = (await toc.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(prose.x + prose.width);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);

  // Jumping to a heading moves it under the header and marks it as the current section.
  await toc.getByRole("link", { name: "Kod ve tablolar" }).click();
  await expect(page).toHaveURL(/#kod-ve-tablolar$/);
  const heading = page.locator("#kod-ve-tablolar").filter({ visible: true });
  await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(200);
  await expect(heading).toBeFocused();
  await expect(toc.locator('[aria-current="location"]')).toHaveText("Kod ve tablolar");

  // Sticky: still on screen after scrolling.
  const after = (await toc.boundingBox())!;
  expect(after.y).toBeGreaterThanOrEqual(0);
  expect(after.y).toBeLessThan(900);
});

test("below 1280px the table of contents is a collapsible block", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(POST);
  await expect(page.getByTestId("toc-sidebar").filter({ visible: true })).toHaveCount(0);
  const details = visible(page, "toc-details");
  await expect(details.getByRole("link", { name: "Kod ve tablolar" })).toBeHidden();
  await details.locator("summary").click();
  await details.getByRole("link", { name: "Kod ve tablolar" }).click();
  await expect(page).toHaveURL(/#kod-ve-tablolar$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  // Two headings are not enough for a table of contents.
  await page.goto("/tr/blog/short-notes");
  await expect(page.locator("h1").filter({ visible: true })).toHaveText("Kısa notlar");
  await expect(page.getByTestId("toc-details")).toHaveCount(0);
  await expect(page.locator("#birinci-not").filter({ visible: true })).toHaveCount(1);
});

test("the progress bar fills as the article is read", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(POST);
  const bar = page.getByTestId("reading-progress").last();
  await expect(bar).toHaveAttribute("data-progress", "0.00");
  await page.evaluate(() => {
    const prose = [...document.querySelectorAll<HTMLElement>("#post-content")].find(
      (node) => node.offsetParent !== null,
    )!;
    window.scrollTo(0, prose.offsetTop + prose.offsetHeight / 2);
  });
  await expect
    .poll(async () => Number(await bar.getAttribute("data-progress")))
    .toBeGreaterThan(0.2);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(bar).toHaveAttribute("data-progress", "1.00");
  // The bar is drawn across the whole width at the end, not only reported.
  expect(await bar.locator("div").evaluate((node) => node.getBoundingClientRect().width)).toBe(
    1280,
  );
});

test("previous and next posts follow the publication date", async ({ page }) => {
  await page.goto(POST);
  const nav = visible(page, "post-nav");
  await expect(nav.getByTestId("post-nav-previous")).toContainText("Kısa notlar");
  await expect(nav.getByTestId("post-nav-next")).toContainText("Merhaba Dünya");
  await nav.getByTestId("post-nav-previous").click();
  await expect(page).toHaveURL(/\/tr\/blog\/short-notes$/);
  // The oldest post has only a next post.
  const older = visible(page, "post-nav");
  await expect(older.getByTestId("post-nav-previous")).toHaveCount(0);
  await expect(older.getByTestId("post-nav-next")).toContainText(
    "Okunabilir metin için tipografi ve boşluk",
  );

  await page.goto("/en/blog/typography-sample");
  await expect(visible(page, "post-nav").getByTestId("post-nav-previous")).toContainText(
    "Short notes",
  );
});

test("share links point at the canonical URL and copy it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(POST);
  const share = visible(page, "share-links");
  const x = new URL(
    (await share.getByRole("link", { name: "X üzerinde paylaş" }).getAttribute("href"))!,
  );
  expect(x.host).toBe("x.com");
  const shared = new URL(x.searchParams.get("url")!);
  expect(shared.pathname).toBe(POST);
  expect(shared.searchParams.get("utm_source")).toBe("share");
  expect(x.searchParams.get("text")).toBe("Okunabilir metin için tipografi ve boşluk");
  const linkedin = new URL(
    (await share.getByRole("link", { name: "LinkedIn üzerinde paylaş" }).getAttribute("href"))!,
  );
  expect(linkedin.searchParams.get("url")).toBe(shared.toString());
  await expect(share.getByRole("link").first()).toHaveAttribute("rel", /noopener/);

  await share.getByRole("button", { name: "Linki kopyala" }).click();
  await expect(share.getByRole("status")).toHaveText("Link kopyalandı");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shared.toString());
});

test("English pages show no Turkish interface text", async ({ page }) => {
  const turkish = [
    "Ekli Dosyalar",
    "Devamını",
    "İçindekiler",
    "Önceki yazı",
    "Sonraki yazı",
    "Linki kopyala",
    "Gönderiliyor",
    "Telefon",
    "Tüm hakları",
    "Yorum yap",
  ];
  for (const path of ["/en/blog", "/en/blog/typography-sample", "/en/contact", "/en/about"]) {
    await page.goto(path);
    await expect(page.locator("main h1").filter({ visible: true })).toHaveCount(1);
    const text = await page.locator("body").innerText();
    for (const phrase of turkish) expect(text, `${path}: ${phrase}`).not.toContain(phrase);
  }
  await page.goto("/en/blog/typography-sample");
  await expect(
    visible(page, "share-links").getByRole("button", { name: "Copy link" }),
  ).toBeVisible();

  // A greeting typed into the name setting is not repeated after the page's own greeting.
  await page.goto("/en/about");
  await expect(page.locator("main h1").filter({ visible: true })).toHaveText("Hello, I am Example");
});

test("empty contact settings hide their rows instead of showing placeholders", async ({ page }) => {
  await page.goto("/tr/contact");
  await expect(page.locator("main h1").filter({ visible: true })).toHaveCount(1);
  const text = await page.locator("main").innerText();
  expect(text).not.toContain("+90 (5XX)");
  expect(text).not.toContain("info@demircucu.com");
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const width of [375, 1440]) {
      test(`reading features pass axe at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        for (const path of [POST, "/en/blog/short-notes", "/tr/contact", "/en/about"]) {
          await page.goto(path);
          await expect(page.locator("main h1").filter({ visible: true })).toHaveCount(1);
          const details = page.getByTestId("toc-details").filter({ visible: true });
          if (await details.count()) await details.locator("summary").click();
          const result = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
          expect(
            result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
            `${path} (${scheme}, ${width}px)`,
          ).toEqual([]);
        }
      });
    }
  });
}
