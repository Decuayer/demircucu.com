import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { renderReadme } from "../lib/github/readme/render";
import { ADMIN, adminClient, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Phase 5 acceptance on a built site with the production CSP: a GitHub project's README (real
 * pipeline output) shows alerts and highlighted code, Mermaid draws its diagram, the README's
 * PDF link opens the pdf.js viewer, and none of it trips the Content Security Policy.
 */

/** One-page PDF with a line of text (pdf.js rebuilds the cross-reference table). */
const PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj << /Length 44 >> stream",
    "BT /F1 18 Tf 40 100 Td (E2E document) Tj ET",
    "endstream endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "trailer << /Root 1 0 R >>",
    "%%EOF",
  ].join("\n"),
);

const README = `# Demo repository

> [!WARNING]
> Experimental.

\`\`\`mermaid
flowchart LR
  Call --> Triage --> Dispatch
\`\`\`

\`\`\`ts
export const answer: number = 42;
\`\`\`

Read the [design report](docs/report.pdf).
`;

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  return violations;
}

/**
 * Last push 22:34 UTC: already the next day in Istanbul. Server (UTC) and browser must still
 * print the same date (hydration).
 */
const PUSHED_AT = "2026-01-24T22:34:58Z";

/** A published GitHub project with a rendered README and one mirrored PDF. */
async function seedGithubProject() {
  const storage = adminClient().storage;
  const { error: bucketError } = await storage.createBucket("media", { public: true });
  if (bucketError && !/exists/i.test(bucketError.message)) throw bucketError;

  // Unique per call: tests in this file run in parallel and must not share rows or files.
  const stamp = randomUUID().slice(0, 8);
  const slug = `e2e-github-${stamp}`;
  const pdfPath = `github/e2e-${stamp}/report.pdf`;
  const upload = await storage
    .from("media")
    .upload(pdfPath, PDF, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw upload.error;

  const [media] = await sql<{ id: string }>(
    `INSERT INTO public."MediaFile" (id, name, type, size, path, source, "repoFullName", "contentHash")
     VALUES (gen_random_uuid()::text, 'report.pdf', 'application/pdf', $1, $2, 'GITHUB', 'Decuayer/e2e', $3)
     RETURNING id`,
    [PDF.length, pdfPath, `e2e-${stamp}`],
  );
  const [project] = await sql<{ id: string }>(
    `INSERT INTO public."Project" (id, slug, source, "githubFullName", "githubDescription", "primaryLanguage",
       languages, stars, published, "syncStatus", "pushedAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'GITHUB', 'Decuayer/e2e-demo', 'Demo from GitHub', 'TypeScript',
       '{"TypeScript": 900, "CSS": 100}', 7, false, 'OK', $2, now())
     RETURNING id`,
    [slug, PUSHED_AT],
  );
  const [doc] = await sql<{ id: string }>(
    `INSERT INTO public."ProjectDocument" (id, "projectId", title, "repoPath", "mediaFileId", "htmlUrl", "mimeType", size, sha, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'Design report', 'docs/report.pdf', $2,
       'https://github.com/Decuayer/e2e-demo/blob/main/docs/report.pdf', 'application/pdf', $3, 'sha', now())
     RETURNING id`,
    [project!.id, media!.id, PDF.length],
  );
  const rendered = await renderReadme(
    README,
    { owner: "Decuayer", repo: "e2e-demo", branch: "main", readmePath: "README.md" },
    async () => ({
      images: new Map(),
      documents: new Map([["docs/report.pdf", `/projects/${slug}/docs/${doc!.id}`]]),
    }),
  );
  // Published last, in one statement with the README: a parallel test on /projects would
  // otherwise prefetch (and cache) the page while it is still half written.
  await sql(
    `UPDATE public."Project" SET "readmeHtml" = $1, "readmeVersion" = 1, published = true WHERE id = $2`,
    [rendered.html, project!.id],
  );

  const cleanup = async () => {
    await sql(`DELETE FROM public."Project" WHERE id = $1`, [project!.id]);
    await sql(`DELETE FROM public."MediaFile" WHERE id = $1`, [media!.id]);
    await storage.from("media").remove([pdfPath]);
  };
  return { slug, docId: doc!.id, cleanup };
}

test("GitHub project: README, Mermaid and PDF viewer under the CSP", async ({ page }) => {
  const { slug, docId, cleanup } = await seedGithubProject();
  try {
    const violations = watchCsp(page);
    await page.goto(`/en/projects/${slug}`);

    // Fallback name and description from GitHub; repository facts.
    await expect(page.getByRole("heading", { level: 1, name: "e2e-demo" })).toBeVisible();
    await expect(page.getByText("Demo from GitHub")).toBeVisible();
    await expect(page.getByText("7 stars")).toBeVisible();

    const readme = page.locator(".markdown-body");
    await expect(readme.locator(".markdown-alert-warning")).toContainText("Experimental.");
    await expect(readme.locator("pre.shiki")).toContainText("answer");
    await expect(readme.locator(".code-copy")).toHaveCount(1);
    // Mermaid is imported lazily and draws an SVG.
    await expect(readme.locator("[data-mermaid] .mermaid-diagram svg")).toBeVisible({
      timeout: 15_000,
    });
    await expect(readme.locator("[data-mermaid]")).toHaveAttribute("data-rendered", "true");

    // The README's PDF link opens the document page with the pdf.js viewer.
    await readme.getByRole("link", { name: "design report" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/projects/${slug}/docs/${docId}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Design report" })).toBeVisible();
    await expect(page.locator(".react-pdf__Page canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("1 / 1")).toBeVisible();

    expect(violations).toEqual([]);
  } finally {
    await cleanup();
  }
});

/** Built-ins pdf.js 6's modern build uses without polyfills; many current browsers lack them. */
const STRIP_NEW_BUILTINS = `
  for (const proto of [Map.prototype, WeakMap.prototype]) {
    delete proto.getOrInsertComputed;
    delete proto.getOrInsert;
  }
  delete Math.sumPrecise;
  delete Uint8Array.fromBase64;
  delete Uint8Array.prototype.toBase64;
  // Not polyfilled by the pdf.js legacy build (lib/pdf/polyfills.js): Safari has no async-iterable
  // streams (text layer), Safari < 17.4 no Promise.withResolvers.
  delete Promise.withResolvers;
  delete ReadableStream.prototype.values;
  delete ReadableStream.prototype[Symbol.asyncIterator];
`;

test("PDF viewer works in browsers without the newest built-ins", async ({ browser }) => {
  const { slug, docId, cleanup } = await seedGithubProject();
  const context = await browser.newContext();
  await context.addInitScript(STRIP_NEW_BUILTINS);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    // The text layer is where Safari failed (`for await` over a ReadableStream).
    const viewerWorks = async () => {
      await expect(page.locator(".react-pdf__Page canvas")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".react-pdf__Page__textContent span").first()).toBeAttached({
        timeout: 15_000,
      });
      await expect(page.getByText("This page couldn’t load")).toHaveCount(0);
    };

    await page.goto(`/en/projects/${slug}/docs/${docId}`);
    await viewerWorks();

    await page.goto(`/en/projects/${slug}`);
    await page.getByRole("tab", { name: /Documents/ }).click();
    await viewerWorks();

    // README link to the document (client-side navigation).
    await page.getByRole("tab", { name: /README/ }).click();
    await page.locator("a[data-document]").first().click();
    await expect(page).toHaveURL(new RegExp(`/docs/${docId}$`));
    await viewerWorks();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await cleanup();
  }
});

test("dates hydrate without mismatch in the visitor's time zone", async ({ browser }) => {
  const { slug, cleanup } = await seedGithubProject();
  const context = await browser.newContext({ timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`/tr/projects/${slug}`);
    await expect(page.getByText("Son güncelleme: 25 Oca 2026")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await cleanup();
  }
});

test("admin project list shows the sync panel and GitHub projects cannot be deleted", async ({
  page,
}) => {
  await clearRateLimits();
  const slug = `e2e-gh-admin-${randomUUID().slice(0, 8)}`;
  const [project] = await sql<{ id: string }>(
    `INSERT INTO public."Project" (id, slug, source, "githubFullName", published, "syncStatus", "syncError", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'GITHUB', 'Decuayer/' || $1, true, 'ERROR', 'GitHub /repos -> 502', now())
     RETURNING id`,
    [slug],
  );
  try {
    await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin%2Fprojects");
    await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
    await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
    await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);

    await expect(page.getByText("GitHub senkronizasyonu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Şimdi senkronize et" })).toBeEnabled();

    const row = page.locator("div[data-slot=card]").filter({ hasText: `/${slug}` });
    await expect(row.getByText("Senkron hatası")).toBeVisible();
    await expect(row.getByText("GitHub /repos -> 502")).toBeVisible();
    await expect(row.getByRole("button", { name: "Sil" })).toHaveCount(0);
    await expect(row.getByRole("button", { name: "README'yi yeniden işle" })).toBeVisible();

    await row.getByRole("button", { name: "Yayından Kaldır" }).click();
    // A server action and list refresh; slower than 5 s when the whole suite runs in parallel.
    await expect(row.getByText("Taslak")).toBeVisible({ timeout: 15_000 });
    const [state] = await sql<{ published: boolean }>(
      `SELECT published FROM public."Project" WHERE id = $1`,
      [project!.id],
    );
    expect(state!.published).toBe(false);
  } finally {
    await sql(`DELETE FROM public."Project" WHERE id = $1`, [project!.id]);
  }
});
