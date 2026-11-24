import { mediaUrl } from "./url";

/**
 * Items of the `files` JSON column: an uploaded file of the media library (`path`) or an
 * external link (`url`). Rows written before Phase 3 also carry a legacy `url` next to `path`;
 * `path` wins.
 */
export type Attachment = { name: string; path: string } | { name: string; url: string };

export function toAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  const result: Attachment[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const { name, path, url } = item as Record<string, unknown>;
    if (typeof name !== "string") continue;
    if (typeof path === "string" && path) result.push({ name, path });
    else if (typeof url === "string" && url) result.push({ name, url });
  }
  return result;
}

export function attachmentHref(attachment: Attachment): string | null {
  return "path" in attachment ? mediaUrl(attachment.path) : attachment.url;
}

export function attachmentPaths(attachments: Attachment[] | undefined): string[] {
  return (attachments ?? []).flatMap((a) => ("path" in a ? [a.path] : []));
}
