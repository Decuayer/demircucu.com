import { cn } from "@/lib/utils";

/**
 * Rich text (phase 8 typography): every block of stored HTML (blog posts, the about text,
 * experience and project details) uses the same reading styles, defined as `.prose-site` in
 * app/globals.css on the site's colour tokens. `article` is the long-form size: 17px text,
 * 1.75 leading and about 68 characters per line (at most 75); `default` is 16px at full width.
 */
export function Prose({
  html,
  size = "default",
  className,
}: {
  html: string;
  size?: "default" | "article";
  className?: string;
}) {
  return (
    <div
      data-testid="prose"
      data-size={size}
      className={cn("prose-site prose", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
