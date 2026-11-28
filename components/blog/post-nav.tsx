import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { getTranslated } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

export interface NavPost {
  slug: string;
  titleTr: string;
  titleEn: string | null;
  createdAt: Date | string;
}

/**
 * Previous (older) and next (newer) post under an article (phase 8). The first and last posts
 * get a single card, kept on its own side.
 */
export function PostNav({
  previous,
  next,
  className,
}: {
  previous: NavPost | null;
  next: NavPost | null;
  className?: string;
}) {
  const t = useTranslations("blog");
  const locale = useLocale();
  if (!previous && !next) return null;

  const card = (post: NavPost, direction: "previous" | "next") => {
    const isNext = direction === "next";
    const Icon = isNext ? ArrowRight : ArrowLeft;
    return (
      <Link
        href={`/blog/${post.slug}`}
        rel={isNext ? "next" : "prev"}
        data-testid={`post-nav-${direction}`}
        className={cn(
          "group flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
          isNext && "text-right sm:col-start-2",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm text-muted-foreground",
            isNext && "justify-end",
          )}
        >
          {!isNext && <Icon aria-hidden className="h-4 w-4" />}
          {t(isNext ? "nextPost" : "previousPost")}
          {isNext && <Icon aria-hidden className="h-4 w-4" />}
        </span>
        <span className="font-semibold text-balance group-hover:text-link">
          {getTranslated(post, "title", locale)}
        </span>
        <time
          dateTime={new Date(post.createdAt).toISOString()}
          className="text-xs text-muted-foreground"
        >
          {formatDate(post.createdAt, locale)}
        </time>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t("postNavigation")}
      data-testid="post-nav"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}
    >
      {previous && card(previous, "previous")}
      {next && card(next, "next")}
    </nav>
  );
}
