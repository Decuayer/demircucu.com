import type { Tag } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { badgeVariants } from "@/components/ui/badge";
import { tagLabel } from "@/lib/tags/view";
import { cn } from "@/lib/utils";

type ChipTag = Pick<Tag, "id" | "slug" | "name" | "nameTr" | "nameEn">;

/**
 * Tag chips linking to the skill page. `relative z-10` keeps them clickable above a card's
 * stretched link (cards must not wrap them in another <a>).
 */
export function TagChips({
  tags,
  locale,
  className,
  chipClassName,
}: {
  tags: readonly ChipTag[];
  locale: string;
  className?: string;
  chipClassName?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <ul className={cn("relative z-10 flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li key={tag.id}>
          <Link
            href={`/skills/${tag.slug}`}
            className={cn(
              badgeVariants({ variant: "secondary" }),
              "bg-accent/50 hover:bg-accent",
              chipClassName,
            )}
          >
            {tagLabel(tag, locale)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
