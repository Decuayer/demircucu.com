/** Pages covered by the design audit. `prod` pages are read from the live site. */
export const PROD = "https://www.demircucu.com";
/** Output folder; AUDIT_OUT lets a run (e.g. one theme) write next to an earlier one. */
export const OUT = process.env.AUDIT_OUT ?? "audit-screenshots";
export const AUTH_STATE = `${OUT}/.auth/admin.json`;
export const WIDTHS = [1440, 768, 375] as const;

export type Source = "prod" | "local-anon" | "local-admin";

export interface AuditPage {
  /** Folder and gallery id. */
  id: string;
  /** Group in the gallery. */
  group: string;
  title: string;
  source: Source;
  /** Path, or a function resolving it (local ids). */
  path: string | (() => Promise<string>);
}

const prod = (id: string, group: string, title: string, path: string): AuditPage => ({
  id,
  group,
  title,
  source: "prod",
  path,
});

export const PROD_PAGES: AuditPage[] = [
  prod("home-tr", "Public", "Ana sayfa (TR)", "/tr"),
  prod("home-en", "Public", "Home (EN)", "/en"),
  prod("about-tr", "Public", "Hakkımda (TR)", "/tr/about"),
  prod("about-en", "Public", "About (EN)", "/en/about"),
  prod("experience-list-tr", "Public", "Deneyim listesi (TR)", "/tr/experience"),
  prod("experience-list-en", "Public", "Experience list (EN)", "/en/experience"),
  prod(
    "experience-detail-tr",
    "Public",
    "Deneyim detay (TR)",
    "/tr/experience/cmoqvv21z0001wlosrh2g1uex",
  ),
  prod("projects-list-tr", "Public", "Proje listesi (TR)", "/tr/projects"),
  prod("project-tatum-tr", "Public", "Proje: tatum (TR)", "/tr/projects/tatum"),
  prod("project-tatum-en", "Public", "Project: tatum (EN)", "/en/projects/tatum"),
  prod("project-site-tr", "Public", "Proje: demircucu-com (TR)", "/tr/projects/demircucu-com"),
  prod("project-netmonitor-tr", "Public", "Proje: NetMonitor (TR)", "/tr/projects/NetMonitor"),
  prod(
    "project-doc-tr",
    "Public",
    "Proje dokümanı (TR)",
    "/tr/projects/aegis-dispatch/docs/cmwv40ytn000y08l6ec0arrvi",
  ),
  prod("blog-list-tr", "Public", "Blog listesi (TR)", "/tr/blog"),
  prod("blog-post-tr", "Public", "Blog yazısı (TR)", "/tr/blog/what-is-machine-learning"),
  prod("blog-post-en", "Public", "Blog post (EN)", "/en/blog/what-is-machine-learning"),
  prod("blog-test-tr", "Public", "Blog yazısı: Test (TR)", "/tr/blog/Test"),
  prod("skills-tr", "Public", "Skill ağacı (TR)", "/tr/skills"),
  prod("skill-python-tr", "Public", "Skill: python (TR)", "/tr/skills/python"),
  prod("contact-tr", "Public", "İletişim (TR)", "/tr/contact"),
  prod("contact-en", "Public", "Contact (EN)", "/en/contact"),
  prod("privacy-tr", "Public", "Gizlilik (TR)", "/tr/privacy"),
  prod("not-found-tr", "Public", "404 (TR)", "/tr/bu-sayfa-yok"),
  prod("not-found-en", "Public", "404 (EN)", "/en/this-page-does-not-exist"),
  prod("project-missing-tr", "Public", "Olmayan proje (TR)", "/tr/projects/olmayan-proje"),
];

const anon = (id: string, title: string, path: string): AuditPage => ({
  id,
  group: "Giriş / kayıt",
  title,
  source: "local-anon",
  path,
});

export const ANON_PAGES: AuditPage[] = [
  anon("login-tr", "Giriş (TR)", "/tr/auth/login"),
  anon("login-en", "Sign in (EN)", "/en/auth/login"),
  anon("register-tr", "Kayıt (TR)", "/tr/auth/register"),
  anon("register-en", "Sign up (EN)", "/en/auth/register"),
  anon("forgot-tr", "Şifremi unuttum (TR)", "/tr/auth/forgot-password"),
  anon("reset-tr", "Şifre sıfırla (TR)", "/tr/auth/reset-password"),
  anon("check-email-tr", "E-posta bekleniyor (TR)", "/tr/auth/check-email"),
  anon("confirmed-tr", "Doğrulandı (TR)", "/tr/auth/confirmed"),
];

export function adminPage(
  id: string,
  group: string,
  title: string,
  path: AuditPage["path"],
): AuditPage {
  return { id, group, title, source: "local-admin", path };
}
