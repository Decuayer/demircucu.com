/**
 * URL rules of the README pipeline (task 1.3). Pure functions; every rule has a unit test.
 *
 * A README refers to repository files with relative paths ("./docs/a.png", "docs/a.png",
 * "../a.png", "/a.png") resolved against the README's own directory, or with absolute GitHub
 * URLs ("github.com/o/r/raw/main/a.png", ".../blob/main/a.png?raw=true",
 * "raw.githubusercontent.com/o/r/main/a.png"). Uploaded attachments live on
 * "github.com/user-attachments/assets/..." and the (private-)user-images hosts.
 */

export interface RepoContext {
  owner: string;
  repo: string;
  branch: string;
  /** Path of the README inside the repository ("README.md", "docs/README.md"). */
  readmePath: string;
}

export type ImageSource =
  /** A file of this repository (or another public repository), downloaded from `url`. */
  | { kind: "repo"; url: string; repoPath: string | null }
  /** Uploaded to GitHub (issue / README attachments); the download follows redirects. */
  | { kind: "attachment"; url: string }
  /** Dynamic badge or card: never mirrored, rendered from its host (CSP allowlist). */
  | { kind: "badge"; url: string }
  /** Any other https image: mirrored like a repository file. */
  | { kind: "external"; url: string }
  /** Unusable (empty, data:, javascript:, malformed). */
  | { kind: "invalid" };

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

/** Hosts of dynamic badges and README cards (kept external, see BADGE_IMAGE_ORIGINS). */
const BADGE_HOSTS = new Set([
  "img.shields.io",
  "badgen.net",
  "badge.fury.io",
  "codecov.io",
  "app.codacy.com",
  "sonarcloud.io",
  "api.netlify.com",
  "forthebadge.com",
  "github-readme-stats.vercel.app",
  "readme-typing-svg.demolab.com",
  "skillicons.dev",
]);

/** Origins the CSP `img-src` allows for badges (lib/security/headers.ts). */
export const BADGE_IMAGE_ORIGINS = [...BADGE_HOSTS].map((host) => `https://${host}`);

const ATTACHMENT_HOSTS = new Set([
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
]);

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Directory of a repository path, without trailing slash ("" for the root). */
function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

/**
 * Resolves a relative reference against the README's directory. A leading "/" means the
 * repository root; "." and ".." are collapsed and never escape the root. Query and fragment
 * are dropped; percent-escapes are decoded. Returns null for an empty result.
 */
export function resolveRepoPath(reference: string, readmePath: string): string | null {
  const bare = reference.split(/[?#]/, 1)[0] ?? "";
  if (!bare) return null;
  const base = bare.startsWith("/") ? [] : dirname(readmePath).split("/").filter(Boolean);
  const segments = [...base];
  for (const segment of safeDecode(bare).split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return segments.length ? segments.join("/") : null;
}

export function rawUrl(owner: string, repo: string, ref: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodePath(ref)}/${encodePath(path)}`;
}

export function blobUrl(owner: string, repo: string, ref: string, path: string): string {
  return `https://github.com/${owner}/${repo}/blob/${encodePath(ref)}/${encodePath(path)}`;
}

interface GithubFileUrl {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  /** "raw" (raw host, /raw/ or ?raw=true) or "blob" (file page). */
  view: "raw" | "blob";
}

/**
 * Parses github.com/{o}/{r}/(raw|blob)/{ref}/{path} and raw.githubusercontent.com/{o}/{r}/{ref}/{path}.
 * The ref is taken as one segment (branch names with "/" resolve to the wrong path, as on
 * GitHub's own short links; READMEs almost always use "main" / "master" / a sha).
 */
export function parseGithubFileUrl(input: string): GithubFileUrl | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const parts = url.pathname.split("/").filter(Boolean).map(safeDecode);
  if (url.hostname === "raw.githubusercontent.com" && parts.length >= 4) {
    const [owner, repo, ref, ...rest] = parts;
    return { owner: owner!, repo: repo!, ref: ref!, path: rest.join("/"), view: "raw" };
  }
  if (url.hostname === "github.com" && parts.length >= 5) {
    const [owner, repo, mode, ref, ...rest] = parts;
    if (mode !== "raw" && mode !== "blob") return null;
    const raw = mode === "raw" || url.searchParams.get("raw") === "true";
    return {
      owner: owner!,
      repo: repo!,
      ref: ref!,
      path: rest.join("/"),
      view: raw ? "raw" : "blob",
    };
  }
  return null;
}

function isBadge(url: URL): boolean {
  if (BADGE_HOSTS.has(url.hostname)) return true;
  // Workflow status badges: github.com/{o}/{r}/(actions/)workflows/{file}/badge.svg
  return (
    url.hostname === "github.com" &&
    /^\/[^/]+\/[^/]+\/(?:actions\/)?workflows\/.+\/badge\.svg$/.test(url.pathname)
  );
}

function isAttachment(url: URL): boolean {
  if (ATTACHMENT_HOSTS.has(url.hostname)) return true;
  return url.hostname === "github.com" && url.pathname.startsWith("/user-attachments/");
}

/** Decides where an `<img src>` (or `<source srcset>` candidate) comes from. */
export function classifyImage(src: string | null | undefined, ctx: RepoContext): ImageSource {
  const value = src?.trim();
  if (!value || value.startsWith("#")) return { kind: "invalid" };

  if (value.startsWith("//")) return classifyImage(`https:${value}`, ctx);
  if (!ABSOLUTE.test(value)) {
    const repoPath = resolveRepoPath(value, ctx.readmePath);
    if (!repoPath) return { kind: "invalid" };
    return { kind: "repo", url: rawUrl(ctx.owner, ctx.repo, ctx.branch, repoPath), repoPath };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { kind: "invalid" };
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return { kind: "invalid" };

  if (isBadge(url)) return { kind: "badge", url: url.toString() };
  if (isAttachment(url)) return { kind: "attachment", url: url.toString() };

  const file = parseGithubFileUrl(url.toString());
  if (file) {
    const sameRepo =
      file.owner.toLowerCase() === ctx.owner.toLowerCase() &&
      file.repo.toLowerCase() === ctx.repo.toLowerCase();
    // A blob link without ?raw=true points at the HTML page; GitHub itself renders such an
    // <img> through its camo proxy from the raw file, so the raw file is used here too.
    return {
      kind: "repo",
      url: rawUrl(file.owner, file.repo, file.ref, file.path),
      repoPath: sameRepo ? file.path : null,
    };
  }
  return { kind: "external", url: url.toString() };
}

export type LinkTarget =
  | { kind: "anchor"; href: string }
  /** A PDF of this repository; the caller maps it to the site's document viewer. */
  | { kind: "document"; repoPath: string; githubUrl: string }
  | { kind: "external"; href: string }
  | { kind: "invalid" };

const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

const isPdf = (path: string) => /\.pdf$/i.test(path);

/** Decides where an `<a href>` goes. Relative links open the file on GitHub. */
export function classifyLink(href: string | null | undefined, ctx: RepoContext): LinkTarget {
  const value = href?.trim();
  if (!value) return { kind: "invalid" };
  if (value.startsWith("#")) return { kind: "anchor", href: value };

  if (!ABSOLUTE.test(value) && !value.startsWith("//")) {
    const repoPath = resolveRepoPath(value, ctx.readmePath);
    if (!repoPath) return { kind: "invalid" };
    const fragment = value.includes("#") ? value.slice(value.indexOf("#")) : "";
    const githubUrl = blobUrl(ctx.owner, ctx.repo, ctx.branch, repoPath);
    if (isPdf(repoPath)) return { kind: "document", repoPath, githubUrl };
    return { kind: "external", href: githubUrl + fragment };
  }

  let url: URL;
  try {
    url = new URL(value.startsWith("//") ? `https:${value}` : value);
  } catch {
    return { kind: "invalid" };
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return { kind: "invalid" };

  const file = parseGithubFileUrl(url.toString());
  if (
    file &&
    isPdf(file.path) &&
    file.owner.toLowerCase() === ctx.owner.toLowerCase() &&
    file.repo.toLowerCase() === ctx.repo.toLowerCase()
  ) {
    return {
      kind: "document",
      repoPath: file.path,
      githubUrl: blobUrl(file.owner, file.repo, file.ref, file.path),
    };
  }
  return { kind: "external", href: url.toString() };
}

/** Theme a GitHub image is meant for: `<picture>` media queries and #gh-*-mode-only fragments. */
export function themeOfImage(src: string, media?: string | null): "light" | "dark" | null {
  if (media) {
    if (/prefers-color-scheme:\s*dark/i.test(media)) return "dark";
    if (/prefers-color-scheme:\s*light/i.test(media)) return "light";
  }
  if (/#gh-dark-mode-only$/i.test(src)) return "dark";
  if (/#gh-light-mode-only$/i.test(src)) return "light";
  return null;
}

/** First URL of a `srcset` value ("a.png 1x, b.png 2x" -> "a.png"). */
export function firstSrcsetUrl(srcset: string | null | undefined): string | null {
  const first = srcset?.split(",")[0]?.trim().split(/\s+/)[0];
  return first || null;
}
