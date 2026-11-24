import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";
import { presentProject, publicProjectQuery } from "@/lib/data/present";
import { mediaPathsInHtml, mediaUrl } from "@/lib/media/url";

export async function getPublishedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  const rows = await prisma.project.findMany({
    ...publicProjectQuery,
    where: { published: true },
    orderBy: { order: "asc" },
  });
  return rows.map(presentProject);
}

export async function getFeaturedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  const rows = await prisma.project.findMany({
    ...publicProjectQuery,
    where: { published: true, featured: true },
    orderBy: { order: "asc" },
  });
  return rows.map(presentProject);
}

export interface ProjectDocumentView {
  id: string;
  title: string;
  repoPath: string;
  size: number;
  /** Mirrored copy (viewer); null when only the GitHub link exists (file above the limit). */
  url: string | null;
  githubUrl: string;
}

export interface GalleryImage {
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
}

async function loadProjectPage(where: { slug: string }) {
  const row = await prisma.project.findFirst({
    ...publicProjectQuery,
    omit: { ...publicProjectQuery.omit, readmeHtml: false },
    where: { ...where, published: true },
    include: {
      ...publicProjectQuery.include,
      documents: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          repoPath: true,
          size: true,
          htmlUrl: true,
          mediaFile: { select: { path: true } },
        },
      },
    },
  });
  if (!row) return null;
  const { documents, readmeHtml, ...rest } = row;

  // Gallery: mirrored README images in reading order.
  const paths = mediaPathsInHtml(readmeHtml);
  const files = paths.length
    ? await prisma.mediaFile.findMany({
        where: { path: { in: paths } },
        select: { path: true, width: true, height: true, altEn: true, name: true },
      })
    : [];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const gallery: GalleryImage[] = paths.flatMap((path) => {
    const file = byPath.get(path);
    const src = mediaUrl(path);
    return file && src
      ? [{ src, width: file.width, height: file.height, alt: file.altEn ?? file.name }]
      : [];
  });

  const project = presentProject(rest);
  return {
    ...project,
    descriptionTr: sanitizeOptionalHtml(project.descriptionTr),
    descriptionEn: sanitizeOptionalHtml(project.descriptionEn),
    readmeHtml,
    documents: documents.map((d): ProjectDocumentView => ({
      id: d.id,
      title: d.title,
      repoPath: d.repoPath,
      size: d.size,
      url: mediaUrl(d.mediaFile?.path),
      githubUrl: d.htmlUrl,
    })),
    gallery,
  };
}

export type ProjectPage = NonNullable<Awaited<ReturnType<typeof loadProjectPage>>>;

export type ProjectPageResult =
  | { kind: "found"; project: ProjectPage }
  | { kind: "redirect"; slug: string }
  | { kind: "notFound" };

/** A published project by slug; an old slug (repository renamed) redirects to the current one. */
export async function getProjectPage(slug: string): Promise<ProjectPageResult> {
  "use cache: remote";
  cacheTag(CacheTags.projects, CacheTags.project(slug));
  cacheLife("hours");
  const project = await loadProjectPage({ slug });
  if (project) return { kind: "found", project };
  const previous = await prisma.projectSlugHistory.findUnique({
    where: { slug },
    select: { project: { select: { slug: true, published: true } } },
  });
  if (previous?.project.published && previous.project.slug !== slug) {
    return { kind: "redirect", slug: previous.project.slug };
  }
  return { kind: "notFound" };
}

/** Slugs prerendered at build time. */
export async function getPublishedProjectSlugs(): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

/** Viewable documents (mirrored) of published projects, prerendered at build time. */
export async function getPublishedDocumentParams(): Promise<{ id: string; docId: string }[]> {
  const rows = await prisma.projectDocument.findMany({
    where: { project: { published: true }, mediaFileId: { not: null } },
    select: { id: true, project: { select: { slug: true } } },
  });
  return rows.map((row) => ({ id: row.project.slug, docId: row.id }));
}
