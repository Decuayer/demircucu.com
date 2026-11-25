import { expect, test as base, type Page } from "@playwright/test";
import { ADMIN, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Cookieless analytics end to end: the tracker records real visits (not headless bots), honours
 * Do Not Track, records outbound clicks and engagement, never counts admins, and the dashboard,
 * detail pages and CSV export are admin only.
 */

/**
 * HeadlessChrome is (correctly) treated as a bot, so these tests browse as a regular Chrome. All
 * tests share one IP; a distinct build number per context makes each a separate visitor (the
 * same IP and user agent would be deduplicated for 30 minutes, as intended).
 */
let build = Date.now() % 100_000;
const chrome = () =>
  `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.${build++}.0 Safari/537.36`;

const test = base.extend({
  userAgent: async ({}, provide) => {
    await provide(chrome());
  },
});

const tag = (name: string) => `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function viewsWith(utm: string) {
  return sql<{ id: string; path: string; durationMs: number | null; entityType: string }>(
    `SELECT id, path, "durationMs", "entityType" FROM public."PageView" WHERE "utmSource" = $1`,
    [utm],
  );
}

async function login(page: Page) {
  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);
}

test.beforeEach(async () => {
  await clearRateLimits();
});

test("a visit is recorded without cookies, with engagement when the visitor moves on", async ({
  page,
  context,
}) => {
  const utm = tag("visit");
  await page.goto(`/tr/blog/hello-world?utm_source=${utm}`);
  await expect.poll(async () => (await viewsWith(utm)).length).toBe(1);
  const [row] = await viewsWith(utm);
  expect(row).toMatchObject({ path: "/blog/hello-world", entityType: "BLOG" });
  // Only next-intl's language preference; analytics sets nothing.
  expect((await context.cookies()).map((cookie) => cookie.name)).toEqual(["NEXT_LOCALE"]);

  // Client-side navigation sends the engagement beacon of the post.
  await page.waitForTimeout(1_200);
  await page.locator("header").getByRole("link", { name: "Projelerim" }).first().click();
  await expect(page).toHaveURL(/\/tr\/projects$/);
  await expect
    .poll(async () => (await viewsWith(utm))[0]?.durationMs ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(500);
});

test.describe("with Do Not Track", () => {
  test.use({ extraHTTPHeaders: { DNT: "1" } });

  test("nothing is recorded", async ({ page }) => {
    const utm = tag("dnt");
    await page.goto(`/tr/about?utm_source=${utm}`);
    await page.waitForTimeout(1_500);
    expect(await viewsWith(utm)).toHaveLength(0);
  });
});

test("an outbound click on a project is recorded", async ({ page }) => {
  const utm = tag("click");
  await page.goto(`/tr/projects/sample-project?utm_source=${utm}`);
  await expect.poll(async () => (await viewsWith(utm)).length).toBe(1);
  const [viewRow] = await viewsWith(utm);
  const popup = page.waitForEvent("popup").catch(() => null);
  await page.locator("main a[data-track=github]").click();
  (await popup)?.close().catch(() => undefined);
  await expect
    .poll(async () => {
      const rows = await sql<{ target: string }>(
        `SELECT target FROM public."OutboundClick" WHERE "pageViewId" = $1`,
        [viewRow!.id],
      );
      return rows.map((r) => r.target);
    })
    .toEqual(["GITHUB"]);
});

test("admins are not counted and see the dashboard, detail pages and export", async ({ page }) => {
  // Some traffic for the dashboard, from a visitor in a separate context.
  const visitor = await page.context().browser()!.newContext({ userAgent: chrome() });
  const visitorPage = await visitor.newPage();
  const utm = tag("dash");
  await visitorPage.goto(`/en/blog/hello-world?utm_source=${utm}`);
  await expect.poll(async () => (await viewsWith(utm)).length).toBe(1);
  await visitor.close();

  await login(page);
  const adminUtm = tag("admin");
  await page.goto(`/tr/about?utm_source=${adminUtm}`);
  await page.waitForTimeout(1_500);
  expect(await viewsWith(adminUtm)).toHaveLength(0);

  await page.goto("/tr/admin?range=7d");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(main.getByTestId("views-chart")).toBeVisible();
  await expect(main.getByTestId("views-chart")).not.toHaveAttribute("data-empty", "true");
  await expect(main.getByText("Okunmamış mesaj")).toBeVisible();

  await page.goto("/tr/admin/analytics?range=today");
  await main.getByRole("tab", { name: "Blog" }).click();
  await main
    .getByRole("link", { name: /Merhaba Dünya/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tr\/admin\/analytics\/blog\//);
  await expect(main.getByTestId("entity-title")).toHaveText("Merhaba Dünya");
  await expect(main.getByText("Ort. okuma süresi")).toBeVisible();

  const csv = await page.request.get("/api/admin/analytics/export?scope=site&range=today");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("section,key,label,views,visitors");
});

test("analytics pages and export reject anonymous visitors", async ({ page, request }) => {
  await page.goto("/tr/admin/analytics");
  await expect(page).toHaveURL(/\/tr\/auth\/login/);
  const csv = await request.get("/api/admin/analytics/export?scope=site");
  expect(csv.status()).toBe(401);
  const track = await request.post("/api/track", {
    data: { type: "view", id: crypto.randomUUID(), path: "/tr" },
    headers: { origin: "https://evil.test" },
  });
  expect(track.status()).toBe(403);
});

test("the privacy policy is linked from the footer in both languages", async ({ page }) => {
  await page.goto("/tr");
  await page.locator("footer").getByRole("link", { name: "Gizlilik" }).click();
  await expect(page).toHaveURL(/\/tr\/privacy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gizlilik Politikası");
  await page.goto("/en/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
  await expect(page.getByText("Do Not Track (DNT)")).toBeVisible();
  await expect(page.getByText(/data controller .* is Demir Cücü/)).toBeVisible();
  await expect(page.getByText(/outside Türkiye/)).toBeVisible();
});
