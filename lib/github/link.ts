/**
 * One-off matching of existing (manual) projects to GitHub repositories (task 1.2,
 * scripts/link-existing-projects.ts). Pure; tested.
 *
 *   1. already linked (githubRepoId set)
 *   2. githubUrl points at a repository of the owner
 *   3. otherwise the title or slug equals the repository name, ignoring case and punctuation
 *      ("Game Catalog" ~ "Game-Catalog")
 *
 * A repository claimed by two projects is reported as a conflict and linked to neither.
 */
import { repoKeyFromUrl } from "./policy";

export interface LinkableProject {
  id: string;
  slug: string;
  titleTr: string | null;
  titleEn: string | null;
  githubUrl: string | null;
  githubRepoId: bigint | null;
}

export interface LinkableRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
}

export type LinkMatch =
  | { project: LinkableProject; kind: "linked"; repo: LinkableRepo | null }
  | { project: LinkableProject; kind: "url" | "name"; repo: LinkableRepo; urlChanges: boolean }
  | { project: LinkableProject; kind: "conflict"; repo: LinkableRepo; others: string[] }
  | { project: LinkableProject; kind: "none"; reason: "noUrl" | "otherOwner" | "unknownRepo" };

export interface LinkPlan {
  matches: LinkMatch[];
  /** Repositories no project claims (the sync imports them as drafts). */
  unclaimed: LinkableRepo[];
}

const compact = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function planLinks(
  projects: LinkableProject[],
  repos: LinkableRepo[],
  owner: string,
): LinkPlan {
  const byKey = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]));
  const byId = new Map(repos.map((r) => [String(r.id), r]));
  const byName = new Map(repos.map((r) => [compact(r.name), r]));

  const raw: LinkMatch[] = projects.map((project) => {
    if (project.githubRepoId !== null) {
      return { project, kind: "linked", repo: byId.get(String(project.githubRepoId)) ?? null };
    }
    const key = repoKeyFromUrl(project.githubUrl);
    if (key) {
      const repo = byKey.get(key);
      if (repo)
        return { project, kind: "url", repo, urlChanges: project.githubUrl !== repo.html_url };
      if (!key.startsWith(`${owner.toLowerCase()}/`))
        return { project, kind: "none", reason: "otherOwner" };
    }
    for (const candidate of [project.titleEn, project.titleTr, project.slug]) {
      const repo = byName.get(compact(candidate));
      if (repo)
        return { project, kind: "name", repo, urlChanges: project.githubUrl !== repo.html_url };
    }
    return { project, kind: "none", reason: key ? "unknownRepo" : "noUrl" };
  });

  // A repository may belong to one project only.
  const claims = new Map<number, LinkableProject[]>();
  for (const match of raw) {
    if ((match.kind === "url" || match.kind === "name" || match.kind === "linked") && match.repo) {
      claims.set(match.repo.id, [...(claims.get(match.repo.id) ?? []), match.project]);
    }
  }
  const matches: LinkMatch[] = raw.map((match) => {
    if (
      (match.kind === "url" || match.kind === "name") &&
      (claims.get(match.repo.id)?.length ?? 0) > 1
    ) {
      const others = claims
        .get(match.repo.id)!
        .filter((p) => p.id !== match.project.id)
        .map((p) => p.slug);
      return { project: match.project, kind: "conflict", repo: match.repo, others };
    }
    return match;
  });

  return { matches, unclaimed: repos.filter((r) => !claims.has(r.id)) };
}
