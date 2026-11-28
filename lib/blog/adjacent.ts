/**
 * Previous and next post (phase 8): all published posts by publication date, newest first.
 * "Previous" is the older neighbour, "next" the newer one; the oldest post has no previous and
 * the newest no next. Client-safe, pure.
 */

export function adjacentPosts<T extends { slug: string }>(
  newestFirst: T[],
  slug: string,
): { previous: T | null; next: T | null } {
  const index = newestFirst.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: newestFirst[index + 1] ?? null,
    next: index > 0 ? newestFirst[index - 1]! : null,
  };
}
