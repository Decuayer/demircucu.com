import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";

/**
 * Cache tags used by `"use cache"` data functions (`cacheTag`) and invalidated by mutations.
 *
 * Tags never include the locale: one mutation invalidates the Turkish and English variants
 * together, because both are rendered from the same row.
 *
 * Invalidation map (the only place that decides what a mutation expires):
 *
 * | Change                         | Tags                                                  |
 * | ------------------------------ | ----------------------------------------------------- |
 * | site settings                  | settings                                              |
 * | project create/update/delete   | projects, project:<slug> (+ previous slug), tags      |
 * | experience create/update/delete| experiences, experience:<id>, tags                    |
 * | blog post create/update/delete | posts, post:<slug> (+ previous slug), tags            |
 * | tag create/update/merge/delete | tags, projects, experiences, posts                    |
 * | comment / like                 | post-interactions:<post id>                           |
 * | contact message, media file    | none (admin pages render per request)                 |
 */
export const CacheTags = {
  settings: "settings",
  projects: "projects",
  project: (slug: string) => `project:${slug}`,
  experiences: "experiences",
  experience: (id: string) => `experience:${id}`,
  posts: "posts",
  post: (slug: string) => `post:${slug}`,
  postInteractions: (postId: string) => `post-interactions:${postId}`,
  /** Skill tree, skill pages and counts. Content changes expire it (counts, first/last use). */
  tags: "tags",
} as const;

export type ContentChange =
  | { entity: "settings" }
  | { entity: "project"; slug: string; previousSlug?: string }
  | { entity: "experience"; id: string }
  | { entity: "post"; slug: string; previousSlug?: string }
  | { entity: "postInteractions"; postId: string }
  | { entity: "tags" }
  | { entity: "contactMessage" }
  | { entity: "media" };

export function tagsFor(change: ContentChange): string[] {
  switch (change.entity) {
    case "settings":
      return [CacheTags.settings];
    case "project":
      return withPrevious(
        [CacheTags.projects, CacheTags.project(change.slug), CacheTags.tags],
        change.previousSlug,
        CacheTags.project,
        change.slug,
      );
    case "experience":
      return [CacheTags.experiences, CacheTags.experience(change.id), CacheTags.tags];
    case "post":
      return withPrevious(
        [CacheTags.posts, CacheTags.post(change.slug), CacheTags.tags],
        change.previousSlug,
        CacheTags.post,
        change.slug,
      );
    case "postInteractions":
      return [CacheTags.postInteractions(change.postId)];
    case "tags":
      // Tag names and visibility appear on every content page.
      return [CacheTags.tags, CacheTags.projects, CacheTags.experiences, CacheTags.posts];
    case "contactMessage":
    case "media":
      return [];
  }
}

function withPrevious(
  tags: string[],
  previous: string | undefined,
  tag: (slug: string) => string,
  current: string,
): string[] {
  return previous && previous !== current ? [...tags, tag(previous)] : tags;
}

/**
 * Delay before the follow-up expiry. Tag expirations reach the shared cache of every instance
 * within ~3 s on Vercel (measured on the Phase 2 Preview).
 */
export const SETTLE_MS = 5_000;

/**
 * Expires every tag affected by the given changes. Server actions only (`updateTag` gives
 * read-your-own-writes: the next request waits for fresh data).
 *
 * A request that arrives while the expiry is still propagating between instances (for example
 * the client router prefetching a public page right after the admin save) can regenerate the
 * page from stale data, which the CDN would then keep until `cacheLife` ends. The tags are
 * therefore expired once more after SETTLE_MS, once the response has been sent (`after`), so
 * such a page is replaced on the next request.
 */
export function invalidate(...changes: ContentChange[]): string[] {
  const tags = [...new Set(changes.flatMap(tagsFor))];
  if (tags.length === 0) return tags;
  for (const tag of tags) updateTag(tag);
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
  });
  return tags;
}
