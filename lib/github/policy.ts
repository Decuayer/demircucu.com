/**
 * Sync policy decisions (approved 2026-11-24). Pure functions, unit tested.
 *
 * - Scope: public repositories of the owner; forks and archived repositories only when the
 *   admin enables them. The filter decides what gets imported; a project that is already
 *   linked keeps syncing (an archived repository stays on the site with a badge).
 * - Initial import: drafts. Repositories created after `autoPublishAfter` are published on
 *   import when they have a description and a README.
 * - Sync never changes `published` after the import (the admin's choice is final), except that
 *   a repository that disappears (deleted or made private) is unpublished.
 */
import type { GithubRepo } from "./client";

export interface SyncPolicy {
  owner: string;
  includeForks: boolean;
  includeArchived: boolean;
  autoPublishAfter: Date;
}

export function isPublicOwnedRepo(
  repo: Pick<GithubRepo, "private" | "visibility" | "owner">,
  owner: string,
): boolean {
  return (
    !repo.private &&
    (repo.visibility === undefined || repo.visibility === "public") &&
    repo.owner.login.toLowerCase() === owner.toLowerCase()
  );
}

export function shouldImport(repo: GithubRepo, policy: SyncPolicy): boolean {
  if (!isPublicOwnedRepo(repo, policy.owner) || repo.disabled) return false;
  if (repo.fork && !policy.includeForks) return false;
  if (repo.archived && !policy.includeArchived) return false;
  return true;
}

export function shouldAutoPublish(
  repo: GithubRepo,
  policy: SyncPolicy,
  hasReadme: boolean,
): boolean {
  return (
    Date.parse(repo.created_at) > policy.autoPublishAfter.getTime() &&
    Boolean(repo.description?.trim()) &&
    hasReadme
  );
}

/** Lower-case slug from a repository name ("Game-Catalog" -> "game-catalog", "demircucu.com" -> "demircucu-com"). */
export function slugFromRepoName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

/** First free slug: `base`, `base-2`, `base-3` ... */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * "owner/name" of a github.com repository URL, lower-cased, or null. Accepts http(s), www,
 * trailing slashes, ".git" and deeper paths ("/tree/main").
 */
export function repoKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;
  const [owner, name] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !name) return null;
  return `${owner}/${name.replace(/\.git$/i, "")}`.toLowerCase();
}

/** PDF files the sync mirrors: everything under a top-level `docs/` directory. */
export function isDocsPdf(path: string): boolean {
  return /^docs\/.+\.pdf$/i.test(path);
}

/** "docs/Final_Report-v2.pdf" -> "Final Report v2". */
export function documentTitle(path: string): string {
  const file = path.split("/").pop() ?? path;
  return (
    file
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || file
  );
}

/** SPDX id, or the license name when GitHub reports NOASSERTION ("Other"). */
export function licenseLabel(license: GithubRepo["license"]): string | null {
  if (!license) return null;
  if (license.spdx_id && license.spdx_id !== "NOASSERTION") return license.spdx_id;
  return license.name || null;
}

export type SyncedTagSource = "GITHUB" | "LANGUAGE";

/**
 * Tag links the sync owns: topics (GITHUB) first, then languages (LANGUAGE) not already
 * covered by a topic.
 */
export function desiredTagLinks(
  topicTagIds: readonly string[],
  languageTagIds: readonly string[],
): Map<string, SyncedTagSource> {
  const links = new Map<string, SyncedTagSource>();
  for (const id of topicTagIds) links.set(id, "GITHUB");
  for (const id of languageTagIds) if (!links.has(id)) links.set(id, "LANGUAGE");
  return links;
}
