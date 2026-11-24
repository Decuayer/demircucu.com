import { updateTag } from "next/cache";

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
 * | project create/update/delete   | projects, project:<slug> (+ project:<previous slug>)  |
 * | experience create/update/delete| experiences, experience:<id>                          |
 * | blog post create/update/delete | posts, post:<slug> (+ post:<previous slug>)           |
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
} as const;

export type ContentChange =
  | { entity: "settings" }
  | { entity: "project"; slug: string; previousSlug?: string }
  | { entity: "experience"; id: string }
  | { entity: "post"; slug: string; previousSlug?: string }
  | { entity: "postInteractions"; postId: string }
  | { entity: "contactMessage" }
  | { entity: "media" };

export function tagsFor(change: ContentChange): string[] {
  switch (change.entity) {
    case "settings":
      return [CacheTags.settings];
    case "project":
      return withPrevious(
        [CacheTags.projects, CacheTags.project(change.slug)],
        change.previousSlug,
        CacheTags.project,
        change.slug,
      );
    case "experience":
      return [CacheTags.experiences, CacheTags.experience(change.id)];
    case "post":
      return withPrevious(
        [CacheTags.posts, CacheTags.post(change.slug)],
        change.previousSlug,
        CacheTags.post,
        change.slug,
      );
    case "postInteractions":
      return [CacheTags.postInteractions(change.postId)];
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
 * Expires every tag affected by the given changes. Server actions only (`updateTag` gives
 * read-your-own-writes: the next request waits for fresh data).
 */
export function invalidate(...changes: ContentChange[]): string[] {
  const tags = [...new Set(changes.flatMap(tagsFor))];
  for (const tag of tags) updateTag(tag);
  return tags;
}
