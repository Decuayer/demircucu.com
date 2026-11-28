import { cn } from "@/lib/utils";

/**
 * Rich text (phase 8 typography): every block of stored HTML (blog posts, the about text,
 * experience and project details) uses the same reading styles, defined as `.prose-site` in
 * app/globals.css on the site's colour tokens. `article` is the long-form size: 17px text,
 * 1.75 leading and about 68 characters per line (at most 75); `default` is 16px at full width.
 */
/** Code blocks scroll sideways on small screens; keyboard users need to reach them (WCAG 2.1.1). */
export function focusableCodeBlocks(html: string): string {
  return html.replace(/<pre(?![^>]*\btabindex=)(\s|>)/g, '<pre tabindex="0"$1');
}

export function Prose({
  html,
  size = "default",
  className,
  id,
}: {
  html: string;
  id?: string;
  size?: "default" | "article";
  className?: string;
}) {
  return (
    <div
      id={id}
      data-testid="prose"
      data-size={size}
      className={cn("prose-site prose", className)}
      dangerouslySetInnerHTML={{ __html: focusableCodeBlocks(html) }}
    />
  );
}
