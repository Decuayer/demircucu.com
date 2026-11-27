import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { sql } from "./helpers/supabase";

/**
 * SEO (phase 8): canonical and hreflang (x-default English), Open Graph and Twitter cards with
 * a generated 1200×630 image, JSON-LD per page type, noindex on private pages, robots and sitemap.
 */

const meta = (page: Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first().getAttribute("content");

async function jsonLdTypes(page: Page): Promise<string[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as { "@type"?: string; "@graph"?: { "@type": string }[] };
    expect(text).not.toContain("<");
    return data["@graph"] ? data["@graph"].map((node) => node["@type"]) : [data["@type"]!];
  });
}

async function expectPng(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.status(), url).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  const bytes = await response.body();
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], url).toEqual([1200, 630]);
}

test("public pages have canonical, hreflang, social cards and structured data", async ({
  page,
  request,
}) => {
  const [experience] = await sql<{ id: string }>(
    `SELECT id FROM public."Experience" WHERE published ORDER BY "createdAt" LIMIT 1`,
  );
  const cases: { path: string; types: string[]; ogType: string }[] = [
    { path: "/tr", types: ["WebSite", "Person"], ogType: "website" },
    { path: "/en/about", types: ["ProfilePage"], ogType: "profile" },
    { path: "/tr/projects", types: [], ogType: "website" },
    {
      path: "/tr/projects/sample-project",
      types: ["SoftwareSourceCode", "BreadcrumbList"],
      ogType: "article",
    },
    { path: "/en/blog/hello-world", types: ["BlogPosting", "BreadcrumbList"], ogType: "article" },
    { path: `/tr/experience/${experience!.id}`, types: ["BreadcrumbList"], ogType: "website" },
    { path: "/tr/skills/python", types: ["BreadcrumbList"], ogType: "website" },
  ];
  const [doc] = await sql<{ slug: string; id: string }>(
    `SELECT p.slug, d.id FROM public."ProjectDocument" d JOIN public."Project" p ON p.id = d."projectId"
     WHERE p.published AND d."mediaFileId" IS NOT NULL LIMIT 1`,
  );
  if (doc) {
    cases.push({
      path: `/tr/projects/${doc.slug}/docs/${doc.id}`,
      types: ["BreadcrumbList"],
      ogType: "website",
    });
  }
  const images = new Set<string>();

  for (const { path, types, ogType } of cases) {
    await page.goto(path);
    const [, locale] = path.split("/");
    const rest = path.slice(3);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).pathname, path).toBe(path);
    for (const [lang, expected] of [
      ["tr", `/tr${rest}`],
      ["en", `/en${rest}`],
      ["x-default", `/en${rest}`],
    ]) {
      const href = await page
        .locator(`link[rel="alternate"][hreflang="${lang}"]`)
        .getAttribute("href");
      expect(new URL(href!).pathname, `${path} ${lang}`).toBe(expected);
    }
    expect(await meta(page, "og:type"), path).toBe(ogType);
    expect(await meta(page, "og:locale"), path).toBe(locale === "tr" ? "tr_TR" : "en_US");
    expect(new URL((await meta(page, "og:url"))!).pathname, path).toBe(path);
    expect(await meta(page, "og:title"), path).toBeTruthy();
    expect(await meta(page, "twitter:card"), path).toBe("summary_large_image");
    const image = await meta(page, "og:image");
    expect(image, path).toMatch(/opengraph-image/);
    images.add(image!);
    expect(await jsonLdTypes(page), path).toEqual(types);
  }

  // Project, post, experience, skill and the site default each get their own card.
  expect(images.size).toBeGreaterThanOrEqual(5);
  for (const image of images) await expectPng(request, image);
});

test("blog structured data names the post, its dates and author", async ({ page }) => {
  await page.goto("/en/blog/hello-world");
  const graph = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').first().textContent())!,
  )["@graph"] as Record<string, unknown>[];
  const post = graph.find((node) => node["@type"] === "BlogPosting")!;
  expect(post).toMatchObject({
    headline: "Hello World",
    inLanguage: "en",
    author: { "@type": "Person" },
  });
  expect(Date.parse(post.datePublished as string)).not.toBeNaN();
  const crumbs = graph.find((node) => node["@type"] === "BreadcrumbList")!;
  expect((crumbs.itemListElement as unknown[]).length).toBe(2);
});

test("private pages are not indexed", async ({ page }) => {
  for (const path of ["/tr/auth/login", "/en/auth/register", "/tr/admin"]) {
    await page.goto(path);
    const robots = await meta(page, "robots");
    expect(robots, path).toContain("noindex");
    expect(robots, path).toContain("nofollow");
  }
});

test("robots.txt blocks a non-production deployment and the sitemap lists x-default", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/\s*$/m);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain('hreflang="x-default"');
  expect(sitemap).toMatch(/hreflang="x-default" href="[^"]+\/en\/projects"/);
});
