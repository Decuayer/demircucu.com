/** Words per minute for the reading-time estimate. */
export const WORDS_PER_MINUTE = 200;

/** Reading time in minutes (at least 1) from HTML: tags and entities are not words. */
export function readingMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ");
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
