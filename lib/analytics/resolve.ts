import "server-only";
import type { AnalyticsEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TrackedRoute } from "./paths";

export interface ResolvedEntity {
  entityType: AnalyticsEntityType;
  /** Row id for content entities; null for HOME and PAGE (keyed by path). */
  entityId: string | null;
}

/**
 * Maps a tracked route to the content row it shows. Unpublished, hidden or missing content
 * gives null, so 404 pages and drafts opened by guessing a URL are not counted.
 */
export async function resolveEntity(route: TrackedRoute): Promise<ResolvedEntity | null> {
  switch (route.kind) {
    case "home":
      return { entityType: "HOME", entityId: null };
    case "page":
      return { entityType: "PAGE", entityId: null };
    case "projectDoc": {
      const doc = await prisma.projectDocument.findFirst({
        where: { id: route.docId, project: { slug: route.slug, published: true } },
        select: { id: true },
      });
      return doc ? { entityType: "PAGE", entityId: null } : null;
    }
    case "project": {
      const row = await prisma.project.findFirst({
        where: { slug: route.slug, published: true },
        select: { id: true },
      });
      return row ? { entityType: "PROJECT", entityId: row.id } : null;
    }
    case "blog": {
      const row = await prisma.blogPost.findFirst({
        where: { slug: route.slug, published: true },
        select: { id: true },
      });
      return row ? { entityType: "BLOG", entityId: row.id } : null;
    }
    case "experience": {
      const row = await prisma.experience.findFirst({
        where: { id: route.id, published: true },
        select: { id: true },
      });
      return row ? { entityType: "EXPERIENCE", entityId: row.id } : null;
    }
    case "skill": {
      const row = await prisma.tag.findFirst({
        where: { slug: route.slug, hidden: false },
        select: { id: true },
      });
      return row ? { entityType: "SKILL", entityId: row.id } : null;
    }
  }
}
