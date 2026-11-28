import { cn } from "@/lib/utils";
import { parseTextBlocks } from "@/lib/text/blocks";

/** Plain text with "- " lists as paragraphs and a bulleted list (see lib/text/blocks). */
export function TextBlocks({ text, className }: { text: string; className?: string }) {
  const blocks = parseTextBlocks(text);
  return (
    <div
      data-testid="text-blocks"
      className={cn("space-y-2 text-sm leading-relaxed text-muted-foreground", className)}
    >
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <p key={i}>{block.text}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-link">
            {block.items.map((item, j) => (
              <li key={j} className="pl-1">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
