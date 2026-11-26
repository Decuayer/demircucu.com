import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";
import { sql } from "../e2e/helpers/supabase";
import {
  adminPage,
  ANON_PAGES,
  AUTH_STATE,
  OUT,
  PROD,
  PROD_PAGES,
  WIDTHS,
  type AuditPage,
} from "./pages";

const one = async (query: string) => (await sql<{ id: string }>(query))[0]?.id ?? "missing";

const ADMIN_PAGES: AuditPage[] = [
  adminPage("admin-dashboard-tr", "Admin", "Dashboard (TR)", "/tr/admin"),
  adminPage("admin-dashboard-en", "Admin", "Dashboard (EN)", "/en/admin"),
  adminPage("admin-analytics", "Admin", "Analitik", "/tr/admin/analytics"),
  adminPage(
    "admin-analytics-blog",
    "Admin",
    "Analitik: blog yazısı",
    async () =>
      `/tr/admin/analytics/blog/${await one(`SELECT id FROM public."BlogPost" WHERE slug = 'hello-world'`)}`,
  ),
  adminPage("admin-experiences", "Admin", "Deneyimler", "/tr/admin/experiences"),
  adminPage("admin-experience-new", "Admin", "Deneyim ekle", "/tr/admin/experiences/new"),
  adminPage(
    "admin-experience-edit",
    "Admin",
    "Deneyim düzenle",
    async () =>
      `/tr/admin/experiences/${await one(`SELECT id FROM public."Experience" ORDER BY "createdAt" LIMIT 1`)}/edit`,
  ),
  adminPage("admin-projects", "Admin", "Projeler + GitHub paneli", "/tr/admin/projects"),
  adminPage("admin-project-new", "Admin", "Proje ekle", "/tr/admin/projects/new"),
  adminPage(
    "admin-project-edit",
    "Admin",
    "Proje düzenle",
    async () =>
      `/tr/admin/projects/${await one(`SELECT id FROM public."Project" WHERE slug = 'sample-project'`)}/edit`,
  ),
  adminPage("admin-blog", "Admin", "Blog yazıları", "/tr/admin/blog"),
  adminPage("admin-blog-new", "Admin", "Yazı ekle", "/tr/admin/blog/new"),
  adminPage(
    "admin-blog-edit",
    "Admin",
    "Yazı düzenle",
    async () =>
      `/tr/admin/blog/${await one(`SELECT id FROM public."BlogPost" WHERE slug = 'hello-world'`)}/edit`,
  ),
  adminPage("admin-tags", "Admin", "Etiketler", "/tr/admin/tags"),
  adminPage("admin-media", "Admin", "Medya", "/tr/admin/media"),
  adminPage("admin-comments", "Admin", "Yorumlar", "/tr/admin/comments"),
  adminPage("admin-contacts", "Admin", "Mesajlar", "/tr/admin/contacts"),
  adminPage("admin-settings", "Admin", "Ayarlar", "/tr/admin/settings"),
  adminPage("profile-tr", "Profil", "Profil (TR)", "/tr/profile"),
  adminPage("profile-likes-tr", "Profil", "Beğeniler (TR)", "/tr/profile/likes"),
  adminPage("profile-en", "Profil", "Profile (EN)", "/en/profile"),
];

export interface WidthResult {
  width: number;
  status: number | null;
  finalUrl: string;
  screenshot: string;
  overflowX: number;
  consoleErrors: string[];
  consoleWarnings: string[];
  images: { src: string; alt: string | null; broken: boolean; w: number; h: number }[];
  headings: string[];
  axe?: {
    id: string;
    impact: string | null;
    help: string;
    nodes: number;
    targets: string[];
  }[];
  focus?: { element: string; visible: boolean }[];
  turkishOnEnglish?: string[];
  smallTargets?: string[];
}

/** Scroll through the page so scroll-driven reveal animations finish before the screenshot. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
}

async function focusWalk(page: Page) {
  const result: { element: string; visible: boolean }[] = [];
  await page
    .locator("body")
    .click({ position: { x: 1, y: 1 } })
    .catch(() => undefined);
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const visible =
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        (style.boxShadow !== "none" && style.boxShadow !== "");
      const label = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.getAttribute("href") ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 50);
      return { element: `${el.tagName.toLowerCase()} "${label}"`, visible };
    });
    if (info) result.push(info);
  }
  return result;
}

export async function auditWidth(page: Page, item: AuditPage, url: string, width: number) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const onConsole = (message: { type(): string; text(): string }) => {
    const text = message.text().slice(0, 300);
    if (message.type() === "error") errors.push(text);
    if (message.type() === "warning") warnings.push(text);
  };
  const onPageError = (error: Error) => errors.push(`pageerror: ${error.message.slice(0, 300)}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 });
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await settle(page);

  const shot = `${item.id}/${width}.png`;
  await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true });

  const facts = await page.evaluate(() => {
    const doc = document.documentElement;
    const images = [...document.images].map((img) => ({
      src: (img.currentSrc || img.src).slice(0, 160),
      alt: img.getAttribute("alt"),
      broken: img.complete && img.naturalWidth === 0,
      w: Math.round(img.getBoundingClientRect().width),
      h: Math.round(img.getBoundingClientRect().height),
    }));
    const headings = [...document.querySelectorAll("h1, h2, h3, h4")]
      .filter((h) => (h as HTMLElement).offsetParent !== null)
      .map(
        (h) =>
          `${h.tagName.toLowerCase()}: ${(h.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70)}`,
      );
    return { overflowX: doc.scrollWidth - window.innerWidth, images, headings };
  });

  const result: WidthResult = {
    width,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    screenshot: shot,
    overflowX: facts.overflowX,
    consoleErrors: errors,
    consoleWarnings: warnings,
    images: facts.images,
    headings: facts.headings,
  };

  if (width !== 768) {
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    result.axe = axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes
        .slice(0, 6)
        .map(
          (n) =>
            `${n.target.join(" ")}${n.failureSummary ? ` — ${n.failureSummary.split("\n").slice(1, 2).join("").trim().slice(0, 140)}` : ""}`,
        ),
    }));
  }
  if (width === 375) {
    result.smallTargets = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a[href], button, [role=button], input, select")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24))
        .slice(0, 15)
        .map(
          ({ el, r }) =>
            `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
        ),
    );
  }
  if (width === 1440) {
    result.focus = await focusWalk(page);
    if (/\/en(\/|$)/.test(new URL(page.url()).pathname)) {
      result.turkishOnEnglish = await page.evaluate(() => {
        const found = new Set<string>();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode.textContent?.trim() ?? "";
          const parent = walker.currentNode.parentElement;
          if (!text || !parent || parent.closest("script, style, article, .prose, [data-readme]"))
            continue;
          if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) found.add(text.slice(0, 80));
        }
        return [...found].slice(0, 40);
      });
    }
  }

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return result;
}

function register(pages: AuditPage[], storage?: string) {
  test.describe(() => {
    if (storage) test.use({ storageState: storage });
    for (const item of pages) {
      test(item.id, async ({ page }) => {
        mkdirSync(`${OUT}/${item.id}`, { recursive: true });
        mkdirSync(`${OUT}/results`, { recursive: true });
        const path = typeof item.path === "string" ? item.path : await item.path();
        const url = item.source === "prod" ? `${PROD}${path}` : path;
        const widths: WidthResult[] = [];
        for (const width of WIDTHS) widths.push(await auditWidth(page, item, url, width));
        writeFileSync(
          `${OUT}/results/${item.id}.json`,
          JSON.stringify({ ...item, path, url, widths }, null, 2),
        );
      });
    }
  });
}

/**
 * AUDIT_THEME=light|dark emulates the system colour scheme (the site follows it by default).
 * AUDIT_SET=theme audits a fixed set of local pages (seed content) so that runs against different
 * builds (before / after a design change) compare the same content.
 */
const THEME = process.env.AUDIT_THEME as "light" | "dark" | undefined;
if (THEME) test.use({ colorScheme: THEME });

const local = (id: string, group: string, title: string, path: AuditPage["path"]): AuditPage => ({
  id,
  group,
  title,
  source: "local-anon",
  path,
});

const THEME_PUBLIC: AuditPage[] = [
  local("home-tr", "Public", "Ana sayfa", "/tr"),
  local("home-en", "Public", "Home (EN)", "/en"),
  local("about-tr", "Public", "Hakkımda", "/tr/about"),
  local("experience-list-tr", "Public", "Deneyim listesi", "/tr/experience"),
  local(
    "experience-detail-tr",
    "Public",
    "Deneyim detay",
    async () =>
      `/tr/experience/${await one(`SELECT id FROM public."Experience" WHERE published ORDER BY "createdAt" LIMIT 1`)}`,
  ),
  local("projects-list-tr", "Public", "Proje listesi", "/tr/projects"),
  local(
    "project-detail-tr",
    "Public",
    "Proje detay (GitHub README)",
    async () =>
      `/tr/projects/${(await sql<{ slug: string }>(`SELECT slug FROM public."Project" WHERE published AND "readmeHtml" IS NOT NULL ORDER BY "createdAt" LIMIT 1`))[0]?.slug ?? "sample-project"}`,
  ),
  local("blog-list-tr", "Public", "Blog listesi", "/tr/blog"),
  local("blog-post-tr", "Public", "Blog yazısı", "/tr/blog/hello-world"),
  local("skills-tr", "Public", "Skill ağacı", "/tr/skills"),
  local("contact-tr", "Public", "İletişim", "/tr/contact"),
  local("not-found-tr", "Public", "404", "/tr/bu-sayfa-yok"),
  local("login-tr", "Giriş / kayıt", "Giriş", "/tr/auth/login"),
];

const THEME_ADMIN: AuditPage[] = [
  adminPage("admin-dashboard-tr", "Admin", "Dashboard", "/tr/admin"),
  adminPage("admin-analytics", "Admin", "Analitik", "/tr/admin/analytics"),
  adminPage("admin-projects", "Admin", "Projeler", "/tr/admin/projects"),
  adminPage(
    "admin-blog-edit",
    "Admin",
    "Yazı düzenle",
    async () =>
      `/tr/admin/blog/${await one(`SELECT id FROM public."BlogPost" WHERE slug = 'hello-world'`)}/edit`,
  ),
  adminPage("admin-settings", "Admin", "Ayarlar", "/tr/admin/settings"),
  adminPage("admin-contacts", "Admin", "Mesajlar", "/tr/admin/contacts"),
];

if (process.env.AUDIT_SET === "theme") {
  register(THEME_PUBLIC);
  register(THEME_ADMIN, AUTH_STATE);
} else {
  register(PROD_PAGES);
  register(ANON_PAGES);
  register(ADMIN_PAGES, AUTH_STATE);
}
