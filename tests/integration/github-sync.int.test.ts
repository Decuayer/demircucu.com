/**
 * Phase 5: the GitHub sync against a real database with a fake GitHub API, download host and
 * storage. Acceptance: idempotent (no duplicate projects, documents or media), override fields
 * and manual tags preserved, PDFs and README images mirrored.
 */
import { createHash } from "node:crypto";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "../helpers/db";
import { anonymousAuth } from "@/lib/github/auth";
import { GithubClient, type GithubRepo } from "@/lib/github/client";
import { startRun, syncAll, syncOne, type SyncDeps } from "@/lib/github/sync";
import { repoFixture } from "@/lib/github/test-fixtures";

const SUPABASE = "https://abc.supabase.co";
const OWNER = "Decuayer";

interface FakeRepo {
  repo: GithubRepo;
  readme?: { path: string; markdown: string; sha: string };
  languages?: Record<string, number>;
  files?: { path: string; sha: string; size: number }[];
}

let repos: FakeRepo[];
let downloads: Record<string, Uint8Array>;
let requests: string[];

const etagOf = (value: string) =>
  `"${createHash("sha256").update(value).digest("hex").slice(0, 16)}"`;

function githubFetch(url: string, init?: RequestInit): Response {
  requests.push(url);
  const ifNoneMatch = (init?.headers as Record<string, string>)["If-None-Match"];
  const conditional = (body: unknown) => {
    const etag = etagOf(JSON.stringify(body));
    if (ifNoneMatch === etag) return new Response(null, { status: 304 });
    return Response.json(body, { headers: { etag } });
  };
  const path = new URL(url).pathname;
  if (path === `/users/${OWNER}/repos`) return Response.json(repos.map((r) => r.repo));
  const match = /^\/repos\/[^/]+\/([^/]+)(\/.*)?$/.exec(path);
  const entry = repos.find((r) => r.repo.name === match?.[1]);
  if (!match || !entry) return new Response("", { status: 404 });
  switch (match[2] ?? "") {
    case "":
      return Response.json(entry.repo);
    case "/readme":
      if (!entry.readme) return new Response("", { status: 404 });
      return conditional({
        path: entry.readme.path,
        sha: entry.readme.sha,
        encoding: "base64",
        content: Buffer.from(entry.readme.markdown).toString("base64"),
      });
    case "/languages":
      return conditional(entry.languages ?? {});
    default:
      if (match[2]!.startsWith("/git/trees/")) {
        return Response.json({
          sha: "tree",
          truncated: false,
          tree: (entry.files ?? []).map((f) => ({ ...f, type: "blob" })),
        });
      }
      return new Response("", { status: 404 });
  }
}

function downloadFetch(url: string): Response {
  const bytes = downloads[url];
  if (!bytes) return new Response("", { status: 404 });
  const response = new Response(Buffer.from(bytes));
  Object.defineProperty(response, "url", { value: url });
  return response;
}

const stored = new Set<string>();
const revalidated: string[] = [];

function deps(): SyncDeps {
  return {
    db: prisma,
    client: new GithubClient({
      auth: anonymousAuth,
      fetch: async (u, i) => githubFetch(u, i),
      sleep: async () => {},
    }),
    store: { put: async (path) => void stored.add(path) },
    owner: OWNER,
    revalidate: (tags) => void revalidated.push(...tags),
    fetch: async (u) => downloadFetch(u),
  };
}

async function fullSync() {
  const run = await startRun(prisma, "MANUAL", null);
  if (!run.started) throw new Error("run did not start");
  return syncAll(deps(), run.runId);
}

const raw = (repo: string, path: string) =>
  `https://raw.githubusercontent.com/${OWNER}/${repo}/main/${path}`;
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n%%EOF");

let image: Buffer;

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  await resetDatabase();
  stored.clear();
  revalidated.length = 0;
  requests = [];
  image ??= await sharp({ create: { width: 64, height: 32, channels: 3, background: "#123456" } })
    .png()
    .toBuffer();

  repos = [
    {
      repo: repoFixture({
        id: 101,
        name: "aegis-dispatch",
        full_name: `${OWNER}/aegis-dispatch`,
        html_url: `https://github.com/${OWNER}/aegis-dispatch`,
        topics: ["typescript", "embeded-systems"],
        language: "TypeScript",
        stargazers_count: 3,
      }),
      readme: {
        path: "README.md",
        sha: "r1",
        markdown:
          "# Aegis\n\n![Arch](docs/images/arch.png)\n\n> [!NOTE]\n> Hi\n\n[Spec](docs/spec.pdf) · [Paper](paper.pdf)\n",
      },
      languages: { TypeScript: 9000, CSS: 1000 },
      files: [
        { path: "docs/spec.pdf", sha: "p1", size: PDF.length },
        { path: "docs/huge.pdf", sha: "p2", size: 30 * 1024 * 1024 },
        { path: "paper.pdf", sha: "p3", size: PDF.length },
        { path: "src/index.ts", sha: "s1", size: 10 },
      ],
    },
    {
      repo: repoFixture({
        id: 102,
        name: "NetMonitor",
        full_name: `${OWNER}/NetMonitor`,
        html_url: `https://github.com/${OWNER}/NetMonitor`,
        language: "C#",
      }),
      readme: { path: "README.md", sha: "n1", markdown: "# NetMonitor\n" },
      languages: { "C#": 100 },
    },
    { repo: repoFixture({ id: 103, name: "forked", full_name: `${OWNER}/forked`, fork: true }) },
  ];
  downloads = {
    [raw("aegis-dispatch", "docs/images/arch.png")]: image,
    [raw("aegis-dispatch", "docs/spec.pdf")]: PDF,
    [raw("aegis-dispatch", "paper.pdf")]: Buffer.concat([PDF, Buffer.from("paper")]),
  };

  // A manual project that points at NetMonitor; the sync links it instead of creating a copy.
  await prisma.project.create({
    data: {
      slug: "net-monitor",
      titleTr: "Ağ İzleyici",
      titleEn: "Net Monitor",
      githubUrl: "https://github.com/decuayer/netmonitor/",
      published: true,
    },
  });
});

describe("GitHub sync", () => {
  it("imports repositories, mirrors media and documents, and links manual projects", async () => {
    const stats = await fullSync();
    expect(stats).toMatchObject({ repos: 3, created: 1, updated: 1, excluded: 1, failed: 0 });

    const aegis = await prisma.project.findUniqueOrThrow({
      where: { slug: "aegis-dispatch" },
      include: { tags: { include: { tag: true } }, documents: { orderBy: { order: "asc" } } },
    });
    expect(aegis).toMatchObject({
      source: "GITHUB",
      published: false, // initial import: draft
      githubFullName: `${OWNER}/aegis-dispatch`,
      stars: 3,
      syncStatus: "OK",
      readmeVersion: 1,
    });
    expect(aegis.tags.map((t) => [t.tag.slug, t.source]).sort()).toEqual([
      ["css", "LANGUAGE"],
      ["embedded-systems", "GITHUB"],
      ["typescript", "GITHUB"],
    ]);

    // docs/ PDFs plus the README-linked one; the 30 MB file stays a GitHub link.
    expect(aegis.documents.map((d) => [d.repoPath, d.mediaFileId !== null])).toEqual([
      ["docs/huge.pdf", false],
      ["docs/spec.pdf", true],
      ["paper.pdf", true],
    ]);
    const spec = aegis.documents.find((d) => d.repoPath === "docs/spec.pdf")!;
    expect(aegis.readmeHtml).toContain(
      `href="/projects/aegis-dispatch/docs/${spec.id}" data-document=""`,
    );
    expect(aegis.readmeHtml).toContain(
      `${SUPABASE}/storage/v1/object/public/media/github/aegis-dispatch/`,
    );
    expect(aegis.readmeHtml).toContain("markdown-alert-note");

    const media = await prisma.mediaFile.findMany({ where: { source: "GITHUB" } });
    expect(media).toHaveLength(3); // image + 2 PDFs
    expect(stored.size).toBe(3);
    expect(await prisma.mediaUsage.count({ where: { entityId: aegis.id, field: "readme" } })).toBe(
      1,
    );

    const net = await prisma.project.findUniqueOrThrow({ where: { slug: "net-monitor" } });
    expect(net).toMatchObject({
      source: "GITHUB",
      titleEn: "Net Monitor",
      published: true,
      githubRepoId: BigInt(102),
    });
    expect(await prisma.project.count()).toBe(2);

    const run = await prisma.githubSyncRun.findFirstOrThrow();
    expect(run).toMatchObject({ status: "OK", trigger: "MANUAL" });
    expect(revalidated).toContain("projects");
    expect(revalidated).toContain("project:aegis-dispatch");
  });

  it("is idempotent and does not refetch unchanged content", async () => {
    await fullSync();
    const before = {
      projects: await prisma.project.count(),
      media: await prisma.mediaFile.count(),
      documents: await prisma.projectDocument.count(),
      tags: await prisma.projectTag.count(),
      html: (await prisma.project.findUniqueOrThrow({ where: { slug: "aegis-dispatch" } }))
        .readmeHtml,
    };
    requests = [];
    revalidated.length = 0;
    const stats = await fullSync();

    expect(stats).toMatchObject({ created: 0, updated: 0, unchanged: 2, failed: 0 });
    expect(requests).toEqual([
      `https://api.github.com/users/${OWNER}/repos?per_page=100&type=owner&sort=pushed`,
    ]);
    expect(revalidated).toEqual([]);
    expect({
      projects: await prisma.project.count(),
      media: await prisma.mediaFile.count(),
      documents: await prisma.projectDocument.count(),
      tags: await prisma.projectTag.count(),
      html: (await prisma.project.findUniqueOrThrow({ where: { slug: "aegis-dispatch" } }))
        .readmeHtml,
    }).toEqual(before);
  });

  it("re-renders after a push without duplicating media, keeping overrides and manual tags", async () => {
    await fullSync();
    const aegis = await prisma.project.findUniqueOrThrow({ where: { slug: "aegis-dispatch" } });
    const manual = await prisma.tag.create({ data: { slug: "robotics", name: "Robotics" } });
    await prisma.project.update({
      where: { id: aegis.id },
      data: { titleTr: "Aegis TR", summaryEn: "Override", published: true, featured: true },
    });
    await prisma.projectTag.create({
      data: { projectId: aegis.id, tagId: manual.id, source: "MANUAL" },
    });

    const entry = repos[0]!;
    entry.repo = {
      ...entry.repo,
      pushed_at: "2026-11-20T00:00:00Z",
      topics: ["typescript"],
      description: "New",
    };
    entry.readme = { ...entry.readme!, sha: "r2", markdown: entry.readme!.markdown + "\nMore.\n" };
    await fullSync();

    const after = await prisma.project.findUniqueOrThrow({
      where: { id: aegis.id },
      include: { tags: { include: { tag: true } } },
    });
    expect(after).toMatchObject({
      titleTr: "Aegis TR",
      summaryEn: "Override",
      published: true,
      featured: true,
      githubDescription: "New",
      readmeSha: "r2",
    });
    expect(after.readmeHtml).toContain("More.");
    expect(after.tags.map((t) => [t.tag.slug, t.source]).sort()).toEqual([
      ["css", "LANGUAGE"],
      ["robotics", "MANUAL"],
      ["typescript", "GITHUB"],
    ]);
    expect(await prisma.mediaFile.count({ where: { source: "GITHUB" } })).toBe(3);
  });

  it("moves the slug on a rename and keeps the old one for redirects", async () => {
    await fullSync();
    const entry = repos[0]!;
    entry.repo = {
      ...entry.repo,
      name: "aegis",
      full_name: `${OWNER}/aegis`,
      html_url: `https://github.com/${OWNER}/aegis`,
    };
    for (const url of Object.keys(downloads)) {
      downloads[url.replace("/aegis-dispatch/", "/aegis/")] = downloads[url]!;
    }
    await fullSync();
    const project = await prisma.project.findFirstOrThrow({ where: { githubRepoId: BigInt(101) } });
    expect(project.slug).toBe("aegis");
    expect(
      await prisma.projectSlugHistory.findUnique({ where: { slug: "aegis-dispatch" } }),
    ).toMatchObject({
      projectId: project.id,
    });
    expect(project.readmeHtml).toContain("/projects/aegis/docs/");
  });

  it("unpublishes projects whose repository disappeared", async () => {
    await fullSync();
    await prisma.project.updateMany({ data: { published: true } });
    repos = repos.filter((r) => r.repo.id !== 101);
    const stats = await fullSync();
    expect(stats.unavailable).toBe(1);
    expect(
      await prisma.project.findFirstOrThrow({ where: { githubRepoId: BigInt(101) } }),
    ).toMatchObject({
      published: false,
      syncStatus: "ERROR",
      syncError: "repoUnavailable",
    });
  });

  it("publishes new repositories with a description and README on import", async () => {
    await fullSync();
    repos.push({
      repo: repoFixture({
        id: 200,
        name: "fresh",
        full_name: `${OWNER}/fresh`,
        created_at: new Date(Date.now() + 60_000).toISOString(),
      }),
      readme: { path: "README.md", sha: "f1", markdown: "# Fresh\n" },
    });
    const run = await startRun(prisma, "WEBHOOK", `${OWNER}/fresh`);
    if (!run.started) throw new Error("not started");
    const stats = await syncOne(deps(), run.runId, `${OWNER}/fresh`);
    expect(stats.created).toBe(1);
    expect(await prisma.project.findUniqueOrThrow({ where: { slug: "fresh" } })).toMatchObject({
      published: true,
    });
  });

  it("records failures per repository and allows only one full run at a time", async () => {
    await fullSync();
    repos[1]!.repo = { ...repos[1]!.repo, pushed_at: "2026-11-23T00:00:00Z" };
    const first = await startRun(prisma, "MANUAL", null);
    expect(await startRun(prisma, "CRON", null)).toEqual({
      started: false,
      reason: "alreadyRunning",
    });
    expect((await startRun(prisma, "WEBHOOK", `${OWNER}/x`)).started).toBe(true);
    if (!first.started) throw new Error("not started");

    const client = new GithubClient({
      auth: anonymousAuth,
      fetch: async (u, i) =>
        u.includes("NetMonitor/languages") ? new Response("", { status: 500 }) : githubFetch(u, i),
      sleep: async () => {},
    });
    const stats = await syncAll({ ...deps(), client }, first.runId);
    expect(stats.failed).toBe(1);
    expect(stats.failures[0]!.repo).toBe(`${OWNER}/NetMonitor`);
    expect(
      await prisma.project.findUniqueOrThrow({ where: { slug: "net-monitor" } }),
    ).toMatchObject({
      syncStatus: "ERROR",
      syncError: expect.stringContaining("500"),
    });
    expect(
      await prisma.githubSyncRun.findUniqueOrThrow({ where: { id: first.runId } }),
    ).toMatchObject({ status: "PARTIAL" });
  });
});
