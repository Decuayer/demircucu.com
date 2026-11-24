/**
 * GitHub sync (task 1.2). Shared by the admin button, the daily cron and the GitHub App
 * webhook. Idempotent: running it twice creates no duplicate projects, documents or media, and
 * it never writes the admin's override fields (titles, summaries, descriptions, liveUrl,
 * featured, order) or `published` after the import.
 *
 * A repository's content (README, languages, PDFs) is fetched again only when it was pushed
 * since the last sync, the README pipeline version changed, the last sync failed, or the
 * admin forced it. Metadata (description, topics, stars ...) comes with the repository list and
 * is refreshed on every run.
 */
import type { Prisma, PrismaClient, Project, SyncTrigger } from "@prisma/client";
import { tagsFor } from "@/lib/cache/tags";
import { syncMediaUsage } from "@/lib/media/usage";
import { mediaUrl } from "@/lib/media/url";
import { TagResolver } from "@/lib/tags/service";
import { selectRepoLanguages } from "@/lib/tags/languages";
import type { GithubClient, GithubRepo, Readme, TreeEntry } from "./client";
import { RateLimitError } from "./client";
import type { FetchLike } from "./auth";
import { MIRROR_LIMITS, RepoMirror, type MirrorStats, type ObjectStore } from "./mirror";
import {
  desiredTagLinks,
  documentTitle,
  isDocsPdf,
  licenseLabel,
  repoKeyFromUrl,
  shouldAutoPublish,
  shouldImport,
  slugFromRepoName,
  uniqueSlug,
  type SyncPolicy,
} from "./policy";
import {
  README_PIPELINE_VERSION,
  renderReadme,
  type ReadmeAssets,
  type ResolvedImage,
} from "./readme/render";
import { blobUrl, rawUrl } from "./readme/urls";

export interface SyncDeps {
  db: PrismaClient;
  client: GithubClient;
  store: ObjectStore;
  owner: string;
  /** Expires cache tags (revalidateTag in the app; a recorder in tests). */
  revalidate: (tags: string[]) => void;
  /** Download fetch for mirrored files (tests inject a fake). */
  fetch?: FetchLike;
  now?: () => number;
}

export type RepoOutcome = "created" | "updated" | "unchanged" | "excluded" | "failed";

export interface RunStats {
  repos: number;
  created: number;
  updated: number;
  unchanged: number;
  excluded: number;
  failed: number;
  unavailable: number;
  remaining: number;
  media: MirrorStats;
  requests: number;
  rateRemaining: number | null;
  authMode: string;
  failures: { repo: string; error: string }[];
}

const emptyStats = (authMode: string): RunStats => ({
  repos: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  excluded: 0,
  failed: 0,
  unavailable: 0,
  remaining: 0,
  media: { downloaded: 0, reused: 0, uploaded: 0, skipped: 0 },
  requests: 0,
  rateRemaining: null,
  authMode,
  failures: [],
});

/** A run older than this that is still RUNNING was cut off (function timeout); it no longer blocks. */
export const STALE_RUN_MS = 10 * 60_000;

/** Time budget of one run; the platform limit (maxDuration 300 s) leaves room to finish up. */
export const RUN_BUDGET_MS = 240_000;

const MAX_ERROR_LENGTH = 500;

const errorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH);

export async function loadPolicy(db: PrismaClient, owner: string): Promise<SyncPolicy> {
  const settings = await db.githubSyncSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });
  return {
    owner,
    includeForks: settings.includeForks,
    includeArchived: settings.includeArchived,
    autoPublishAfter: settings.autoPublishAfter,
  };
}

/** Projects linked to the repository, or a manual project whose githubUrl points at it. */
async function findProject(db: PrismaClient, repo: GithubRepo): Promise<Project | null> {
  const linked = await db.project.findUnique({ where: { githubRepoId: BigInt(repo.id) } });
  if (linked) return linked;
  const key = repo.full_name.toLowerCase();
  const candidates = await db.project.findMany({
    where: { githubRepoId: null, githubUrl: { contains: repo.name, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
  });
  return candidates.find((p) => repoKeyFromUrl(p.githubUrl) === key) ?? null;
}

async function takenSlugs(
  tx: Prisma.TransactionClient,
  base: string,
  exceptProjectId?: string,
): Promise<Set<string>> {
  const [projects, history] = await Promise.all([
    tx.project.findMany({
      where: { slug: { startsWith: base } },
      select: { id: true, slug: true },
    }),
    tx.projectSlugHistory.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true, projectId: true },
    }),
  ]);
  return new Set([
    ...projects.filter((p) => p.id !== exceptProjectId).map((p) => p.slug),
    ...history.filter((h) => h.projectId !== exceptProjectId).map((h) => h.slug),
  ]);
}

/** Replaces the GITHUB / LANGUAGE links of a project; MANUAL links and `hidden` flags stay. */
async function applySyncedTags(
  tx: Prisma.TransactionClient,
  projectId: string,
  topics: readonly string[],
  languages: readonly string[],
): Promise<void> {
  const resolver = await TagResolver.load(tx);
  const topicIds = await resolver.ensureAll(topics);
  const languageIds: string[] = [];
  for (const name of languages) {
    const tag = await resolver.ensure(name, { kind: "LANGUAGE", name });
    if (tag && !languageIds.includes(tag.id)) languageIds.push(tag.id);
  }
  const desired = desiredTagLinks(topicIds, languageIds);
  const current = await tx.projectTag.findMany({
    where: { projectId },
    select: { tagId: true, source: true },
  });

  const stale = current
    .filter((l) => l.source !== "MANUAL" && !desired.has(l.tagId))
    .map((l) => l.tagId);
  if (stale.length) await tx.projectTag.deleteMany({ where: { projectId, tagId: { in: stale } } });
  for (const link of current) {
    const want = desired.get(link.tagId);
    if (want && link.source !== "MANUAL" && link.source !== want) {
      await tx.projectTag.update({
        where: { projectId_tagId: { projectId, tagId: link.tagId } },
        data: { source: want },
      });
    }
  }
  const existing = new Set(current.map((l) => l.tagId));
  const missing = [...desired].filter(([tagId]) => !existing.has(tagId));
  if (missing.length) {
    await tx.projectTag.createMany({
      data: missing.map(([tagId, source]) => ({ projectId, tagId, source })),
      skipDuplicates: true,
    });
  }
}

interface FetchedContent {
  readme: Readme | null | "unchanged";
  languages: Record<string, number> | null | "unchanged";
  languagesEtag: string | null;
  pdfs: TreeEntry[];
  treeSha: string | null;
}

/** README, languages and the PDF candidates of one repository. */
async function fetchContent(
  deps: SyncDeps,
  repo: GithubRepo,
  project: Project | null,
  force: boolean,
): Promise<FetchedContent> {
  const [owner, name] = repo.full_name.split("/") as [string, string];
  // A rename or branch change rewrites URLs inside the README: render it again.
  const canReuse =
    !force &&
    project?.readmeVersion === README_PIPELINE_VERSION &&
    project.githubFullName === repo.full_name &&
    project.defaultBranch === repo.default_branch;
  const readme = await deps.client.getReadme(owner, name, canReuse ? project?.readmeEtag : null);
  const languages = await deps.client.getLanguages(
    owner,
    name,
    force ? null : project?.languagesEtag,
  );
  const tree = await deps.client.getTree(owner, name, repo.default_branch);

  return {
    readme:
      readme.status === "ok" ? readme.data : readme.status === "notModified" ? "unchanged" : null,
    languages:
      languages.status === "ok"
        ? languages.data
        : languages.status === "notModified"
          ? "unchanged"
          : null,
    languagesEtag: languages.status === "ok" ? languages.etag : (project?.languagesEtag ?? null),
    // Every PDF of the tree: docs/ ones are mirrored, the others only when the README links them.
    pdfs: tree?.files.filter((f) => /\.pdf$/i.test(f.path)) ?? [],
    treeSha: tree?.sha ?? null,
  };
}

/** Base columns from the repository (never override fields). */
function repoColumns(repo: GithubRepo, now: Date) {
  return {
    source: "GITHUB" as const,
    githubRepoId: BigInt(repo.id),
    githubFullName: repo.full_name,
    defaultBranch: repo.default_branch,
    githubDescription: repo.description?.trim() || null,
    homepage: repo.homepage?.trim() || null,
    primaryLanguage: repo.language,
    license: licenseLabel(repo.license),
    topics: repo.topics,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    isArchived: repo.archived,
    isFork: repo.fork,
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    repoCreatedAt: new Date(repo.created_at),
    lastSyncedAt: now,
  };
}

interface DocumentRow {
  id: string;
  repoPath: string;
}

/**
 * Mirrors the PDFs (docs/ plus those the README links to) and keeps ProjectDocument rows in step.
 * Unchanged blobs (same sha) are not downloaded again. Rows for removed files are deleted; their
 * media stays until the admin's garbage collection.
 */
async function syncDocuments(
  deps: SyncDeps,
  mirror: RepoMirror,
  project: { id: string },
  repo: GithubRepo,
  wanted: TreeEntry[],
): Promise<DocumentRow[]> {
  const [owner, name] = repo.full_name.split("/") as [string, string];
  const existing = await deps.db.projectDocument.findMany({ where: { projectId: project.id } });
  const byPath = new Map(existing.map((d) => [d.repoPath, d]));
  const rows: DocumentRow[] = [];

  const sorted = [...new Map(wanted.map((f) => [f.path, f])).values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  for (const [order, file] of sorted.entries()) {
    const htmlUrl = blobUrl(owner, name, repo.default_branch, file.path);
    const current = byPath.get(file.path);
    // Same blob: nothing to download (mirrored, or known to exceed the limit).
    let mediaFileId = current?.sha === file.sha ? current.mediaFileId : undefined;
    if (mediaFileId === undefined && file.size > MIRROR_LIMITS.document) mediaFileId = null;
    if (mediaFileId === undefined) {
      const result = await mirror.document(
        rawUrl(owner, name, repo.default_branch, file.path),
        file.path.split("/").pop() ?? file.path,
      );
      if (!result.ok && result.reason !== "tooLarge") {
        // Not a PDF or unreachable this time: keep what was there.
        if (current) rows.push({ id: current.id, repoPath: current.repoPath });
        continue;
      }
      mediaFileId = result.ok ? result.file.id : null;
    }
    const data = {
      title: current?.title ?? documentTitle(file.path),
      htmlUrl,
      mediaFileId,
      mimeType: "application/pdf",
      size: file.size,
      sha: file.sha,
      order,
    };
    const row = await deps.db.projectDocument.upsert({
      where: { projectId_repoPath: { projectId: project.id, repoPath: file.path } },
      create: { projectId: project.id, repoPath: file.path, ...data },
      update: data,
      select: { id: true, repoPath: true },
    });
    rows.push(row);
  }
  const keep = new Set(rows.map((r) => r.repoPath));
  const removed = existing.filter((d) => !keep.has(d.repoPath)).map((d) => d.id);
  if (removed.length) await deps.db.projectDocument.deleteMany({ where: { id: { in: removed } } });
  return rows;
}

async function renderAndStoreReadme(
  deps: SyncDeps,
  mirror: RepoMirror,
  project: { id: string; slug: string },
  repo: GithubRepo,
  readme: Readme,
  pdfs: TreeEntry[],
): Promise<void> {
  const [owner, name] = repo.full_name.split("/") as [string, string];
  const ctx = { owner, repo: name, branch: repo.default_branch, readmePath: readme.path };
  const pdfByPath = new Map(pdfs.map((p) => [p.path, p]));
  let documents: DocumentRow[] = [];

  const rendered = await renderReadme(readme.markdown, ctx, async (refs) => {
    // PDFs: docs/ plus README links that exist in the repository.
    const wanted = pdfs.filter((p) => isDocsPdf(p.path));
    for (const doc of refs.documents) {
      const entry =
        pdfByPath.get(doc.repoPath) ??
        (await deps.client.getFileInfo(owner, name, doc.repoPath, repo.default_branch));
      if (entry) wanted.push(entry);
    }
    documents = await syncDocuments(deps, mirror, project, repo, wanted);

    const images = new Map<string, ResolvedImage>();
    for (const image of refs.images) {
      const result = await mirror.image(image.url);
      if (result.ok) {
        const src = mediaUrl(result.file.path);
        images.set(
          image.url,
          src
            ? {
                kind: "mirrored",
                src,
                path: result.file.path,
                width: result.file.width,
                height: result.file.height,
              }
            : { kind: "link", href: image.url },
        );
      } else {
        const href =
          image.kind === "repo" && image.repoPath
            ? blobUrl(owner, name, repo.default_branch, image.repoPath)
            : image.url;
        images.set(image.url, { kind: "link", href });
      }
    }
    const assets: ReadmeAssets = {
      images,
      documents: new Map(
        documents.map((d) => [d.repoPath, `/projects/${project.slug}/docs/${d.id}`]),
      ),
    };
    return assets;
  });

  await deps.db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: project.id },
      data: {
        readmeMarkdown: readme.markdown,
        readmeHtml: rendered.html,
        readmeSha: readme.sha,
        readmeEtag: readme.etag,
        readmeVersion: README_PIPELINE_VERSION,
      },
    });
    await syncMediaUsage(tx, "PROJECT", project.id, { optional: { readme: rendered.mediaPaths } });
  });
}

export interface RepoSyncResult {
  outcome: RepoOutcome;
  /** Cache tags to expire. */
  tags: string[];
}

/** Syncs one repository. Throws on failure (the caller records it). */
export async function syncRepository(
  deps: SyncDeps,
  policy: SyncPolicy,
  repo: GithubRepo,
  options: { force?: boolean; mirrorStats?: MirrorStats } = {},
): Promise<RepoSyncResult> {
  const now = new Date(deps.now?.() ?? Date.now());
  const found = await findProject(deps.db, repo);
  if (!found && !shouldImport(repo, policy)) return { outcome: "excluded", tags: [] };

  const pushedChanged =
    !found ||
    found.pushedAt?.toISOString() !==
      (repo.pushed_at ? new Date(repo.pushed_at).toISOString() : undefined);
  const needsContent =
    options.force ||
    !found ||
    pushedChanged ||
    found.readmeVersion !== README_PIPELINE_VERSION ||
    found.syncStatus !== "OK" ||
    found.defaultBranch !== repo.default_branch ||
    found.githubFullName !== repo.full_name;

  const content = needsContent
    ? await fetchContent(deps, repo, found, Boolean(options.force))
    : null;
  const languages =
    content && content.languages !== "unchanged"
      ? content.languages
      : ((found?.languages as Record<string, number> | null) ?? null);
  const hasReadme = content ? content.readme !== null : Boolean(found?.readmeHtml);

  // Project row, slug and tags in one transaction.
  const previousSlug = found?.slug;
  const project = await deps.db.$transaction(async (tx) => {
    const columns = {
      ...repoColumns(repo, now),
      ...(content && content.languages !== "unchanged"
        ? { languages: content.languages ?? undefined, languagesEtag: content.languagesEtag }
        : {}),
      ...(content?.treeSha ? { treeSha: content.treeSha } : {}),
      githubUrl: found?.githubUrl || repo.html_url,
    };
    let row: Project;
    if (!found) {
      const base = slugFromRepoName(repo.name);
      row = await tx.project.create({
        data: {
          ...columns,
          slug: uniqueSlug(base, await takenSlugs(tx, base)),
          published: shouldAutoPublish(repo, policy, hasReadme),
          syncStatus: "PENDING",
        },
      });
    } else {
      // A rename moves a slug that was derived from the old name; the old one redirects.
      let slug = found.slug;
      const oldName = found.githubFullName?.split("/").pop();
      if (oldName && oldName !== repo.name && found.slug === slugFromRepoName(oldName)) {
        const base = slugFromRepoName(repo.name);
        slug = uniqueSlug(base, await takenSlugs(tx, base, found.id));
        if (slug !== found.slug) {
          await tx.projectSlugHistory.upsert({
            where: { slug: found.slug },
            create: { slug: found.slug, projectId: found.id },
            update: { projectId: found.id },
          });
          await tx.projectSlugHistory.deleteMany({ where: { slug } });
        }
      }
      row = await tx.project.update({ where: { id: found.id }, data: { ...columns, slug } });
    }
    await applySyncedTags(tx, row.id, repo.topics, selectRepoLanguages(repo.language, languages));
    return row;
  });

  if (content) {
    const mirror = new RepoMirror(deps.db, deps.store, repo.full_name, deps.fetch);
    if (content.readme && content.readme !== "unchanged") {
      await renderAndStoreReadme(deps, mirror, project, repo, content.readme, content.pdfs);
    } else {
      if (content.readme === null) {
        await deps.db.$transaction(async (tx) => {
          await tx.project.update({
            where: { id: project.id },
            data: {
              readmeMarkdown: null,
              readmeHtml: null,
              readmeSha: null,
              readmeEtag: null,
              readmeVersion: README_PIPELINE_VERSION,
            },
          });
          await syncMediaUsage(tx, "PROJECT", project.id, { optional: { readme: [] } });
        });
      }
      // README unchanged or missing: PDFs under docs/ still follow the tree.
      await syncDocuments(
        deps,
        mirror,
        project,
        repo,
        content.pdfs
          .filter((p) => isDocsPdf(p.path))
          .concat(await linkedDocumentsStillPresent(deps, project.id, content.pdfs)),
      );
    }
    if (options.mirrorStats)
      for (const key of Object.keys(mirror.stats) as (keyof MirrorStats)[])
        options.mirrorStats[key] += mirror.stats[key];
  }

  await deps.db.project.update({
    where: { id: project.id },
    data: { syncStatus: "OK", syncError: null, lastSyncedAt: now },
  });

  const changed = !found || needsContent || hasMetadataChange(found, repo);
  return {
    outcome: !found ? "created" : changed ? "updated" : "unchanged",
    tags: changed ? tagsFor({ entity: "project", slug: project.slug, previousSlug }) : [],
  };
}

/** README-linked PDFs outside docs/ that are still in the tree (README unchanged). */
async function linkedDocumentsStillPresent(
  deps: SyncDeps,
  projectId: string,
  pdfs: TreeEntry[],
): Promise<TreeEntry[]> {
  const docs = await deps.db.projectDocument.findMany({
    where: { projectId },
    select: { repoPath: true },
  });
  const byPath = new Map(pdfs.map((p) => [p.path, p]));
  return docs
    .filter((d) => !isDocsPdf(d.repoPath) && byPath.has(d.repoPath))
    .map((d) => byPath.get(d.repoPath)!);
}

function hasMetadataChange(project: Project, repo: GithubRepo): boolean {
  return (
    project.githubDescription !== (repo.description?.trim() || null) ||
    project.homepage !== (repo.homepage?.trim() || null) ||
    project.stars !== repo.stargazers_count ||
    project.forks !== repo.forks_count ||
    project.isArchived !== repo.archived ||
    project.primaryLanguage !== repo.language ||
    project.license !== licenseLabel(repo.license) ||
    project.topics.join(",") !== repo.topics.join(",")
  );
}

/**
 * The repository is gone (deleted, private, transferred). The project is unpublished so mirrored
 * content of a private repository does not stay public; the admin decides what happens next.
 */
async function markUnavailable(
  deps: SyncDeps,
  project: Pick<Project, "id" | "slug" | "published" | "syncError">,
): Promise<string[]> {
  if (project.syncError === "repoUnavailable" && !project.published) return [];
  await deps.db.project.update({
    where: { id: project.id },
    data: { published: false, syncStatus: "ERROR", syncError: "repoUnavailable" },
  });
  return tagsFor({ entity: "project", slug: project.slug });
}

async function recordFailure(deps: SyncDeps, repo: GithubRepo, error: unknown): Promise<void> {
  await deps.db.project.updateMany({
    where: { githubRepoId: BigInt(repo.id) },
    data: { syncStatus: "ERROR", syncError: errorMessage(error) },
  });
}

export type StartResult =
  { started: true; runId: string } | { started: false; reason: "alreadyRunning" };

/** Opens a run unless a full run is already in progress. Stale runs are closed first. */
export async function startRun(
  db: PrismaClient,
  trigger: SyncTrigger,
  scope: string | null,
  now = Date.now(),
): Promise<StartResult> {
  const staleBefore = new Date(now - STALE_RUN_MS);
  await db.githubSyncRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: staleBefore } },
    data: { status: "ERROR", error: "timedOut", finishedAt: new Date(now) },
  });
  if (scope === null) {
    const running = await db.githubSyncRun.findFirst({ where: { status: "RUNNING", scope: null } });
    if (running) return { started: false, reason: "alreadyRunning" };
  }
  const run = await db.githubSyncRun.create({ data: { trigger, scope }, select: { id: true } });
  return { started: true, runId: run.id };
}

async function finishRun(
  deps: SyncDeps,
  runId: string,
  stats: RunStats,
  fatal: unknown,
): Promise<void> {
  stats.requests = deps.client.requests;
  stats.rateRemaining = deps.client.rateRemaining;
  const status = fatal ? "ERROR" : stats.failed > 0 || stats.remaining > 0 ? "PARTIAL" : "OK";
  await deps.db.githubSyncRun.update({
    where: { id: runId },
    data: {
      status,
      stats: stats as unknown as Prisma.InputJsonValue,
      error: fatal ? errorMessage(fatal) : null,
      finishedAt: new Date(deps.now?.() ?? Date.now()),
    },
  });
}

function needsWork(project: Project | undefined, repo: GithubRepo): number {
  if (!project) return 0;
  if (project.syncStatus !== "OK" || project.readmeVersion !== README_PIPELINE_VERSION) return 1;
  return project.pushedAt?.toISOString() ===
    (repo.pushed_at ? new Date(repo.pushed_at).toISOString() : undefined)
    ? 3
    : 2;
}

/** Full sync. Stops at the time budget with status PARTIAL; the next run continues. */
export async function syncAll(
  deps: SyncDeps,
  runId: string,
  options: { force?: boolean; budgetMs?: number } = {},
): Promise<RunStats> {
  const started = deps.now?.() ?? Date.now();
  const stats = emptyStats(deps.client.auth.mode);
  const tags = new Set<string>();
  let fatal: unknown = null;
  try {
    const policy = await loadPolicy(deps.db, deps.owner);
    const repos = (await deps.client.listOwnerRepos(deps.owner)).filter(
      (r) => r.owner.login.toLowerCase() === deps.owner.toLowerCase(),
    );
    stats.repos = repos.length;
    const linked = await deps.db.project.findMany({ where: { githubRepoId: { not: null } } });
    const byRepoId = new Map(linked.map((p) => [String(p.githubRepoId), p]));
    // New repositories and failed / outdated ones first, untouched ones last.
    const queue = [...repos].sort(
      (a, b) => needsWork(byRepoId.get(String(a.id)), a) - needsWork(byRepoId.get(String(b.id)), b),
    );

    for (const [index, repo] of queue.entries()) {
      if ((deps.now?.() ?? Date.now()) - started > (options.budgetMs ?? RUN_BUDGET_MS)) {
        stats.remaining = queue.length - index;
        break;
      }
      try {
        const result = await syncRepository(deps, policy, repo, {
          force: options.force,
          mirrorStats: stats.media,
        });
        stats[result.outcome]++;
        result.tags.forEach((t) => tags.add(t));
      } catch (error) {
        if (error instanceof RateLimitError) throw error;
        stats.failed++;
        stats.failures.push({ repo: repo.full_name, error: errorMessage(error) });
        await recordFailure(deps, repo, error);
      }
    }

    // Linked projects whose repository is no longer listed (only after a complete pass).
    if (stats.remaining === 0) {
      const listed = new Set(repos.filter((r) => !r.private).map((r) => String(r.id)));
      for (const project of linked) {
        if (listed.has(String(project.githubRepoId))) continue;
        const expired = await markUnavailable(deps, project);
        if (expired.length) stats.unavailable++;
        expired.forEach((t) => tags.add(t));
      }
    }
  } catch (error) {
    fatal = error;
  } finally {
    if (tags.size) deps.revalidate([...tags]);
    await finishRun(deps, runId, stats, fatal);
  }
  return stats;
}

/** Syncs one repository by "owner/name" (webhook, admin row button). */
export async function syncOne(
  deps: SyncDeps,
  runId: string,
  fullName: string,
  options: { force?: boolean; repoId?: number } = {},
): Promise<RunStats> {
  const stats = emptyStats(deps.client.auth.mode);
  stats.repos = 1;
  let fatal: unknown = null;
  let tags: string[] = [];
  try {
    const policy = await loadPolicy(deps.db, deps.owner);
    const [owner, name] = fullName.split("/") as [string, string];
    const repo =
      owner.toLowerCase() === deps.owner.toLowerCase()
        ? await deps.client.getRepo(owner, name)
        : null;
    if (!repo || repo.private || repo.owner.login.toLowerCase() !== deps.owner.toLowerCase()) {
      const project = await deps.db.project.findFirst({
        where: options.repoId
          ? { githubRepoId: BigInt(options.repoId) }
          : { githubFullName: { equals: fullName, mode: "insensitive" } },
      });
      if (project) {
        tags = await markUnavailable(deps, project);
        stats.unavailable = 1;
      } else stats.excluded = 1;
    } else {
      try {
        const result = await syncRepository(deps, policy, repo, {
          force: options.force,
          mirrorStats: stats.media,
        });
        stats[result.outcome]++;
        tags = result.tags;
      } catch (error) {
        if (error instanceof RateLimitError) throw error;
        stats.failed = 1;
        stats.failures.push({ repo: repo.full_name, error: errorMessage(error) });
        await recordFailure(deps, repo, error);
      }
    }
  } catch (error) {
    fatal = error;
  } finally {
    if (tags.length) deps.revalidate(tags);
    await finishRun(deps, runId, stats, fatal);
  }
  return stats;
}
