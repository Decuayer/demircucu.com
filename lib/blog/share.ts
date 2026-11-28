/**
 * Share links for a post (phase 8): plain intent URLs, no third-party scripts. The shared
 * address is the canonical URL with `utm_source=share`, so visits from shares show in analytics.
 */

export function shareUrl(canonical: string): string {
  const url = new URL(canonical);
  url.searchParams.set("utm_source", "share");
  return url.toString();
}

export function shareLinks(url: string, title: string): { x: string; linkedin: string } {
  return {
    x: `https://x.com/intent/post?${new URLSearchParams({ text: title, url })}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`,
  };
}
