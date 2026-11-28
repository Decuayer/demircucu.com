"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ListTree } from "lucide-react";
import type { TocHeading } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";

/**
 * Table of contents for a post (phase 8). `TocSidebar`: the sticky list beside the article from
 * 1280px, with the section being read marked (`aria-current="location"`). `TocDetails`: a
 * collapsible block above the article below 1280px (works without JavaScript). Jumps scroll
 * smoothly unless reduced motion is preferred; the heading's `scroll-margin` clears the header.
 */

/** Smooth jump to a heading (instant with reduced motion); the URL hash still updates. */
function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  target.focus({ preventScroll: true });
}

function TocList({ headings, active }: { headings: TocHeading[]; active?: string }) {
  return (
    <ol className="space-y-2 text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "pl-4" : undefined}>
          <a
            href={`#${heading.id}`}
            onClick={(event) => jump(event, heading.id)}
            aria-current={active === heading.id ? "location" : undefined}
            className={cn(
              "-ml-px block border-l-2 border-transparent py-1 pl-3 text-muted-foreground transition-colors hover:text-foreground",
              "aria-[current=location]:border-primary aria-[current=location]:font-medium aria-[current=location]:text-foreground",
            )}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** The heading whose section is being read: the last one above a line 1/4 down the screen. */
function useActiveHeading(headings: TocHeading[]): string | undefined {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight / 4;
      let current: string | undefined;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line) current = element.id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);
  return active;
}

export function TocSidebar({
  headings,
  className,
}: {
  headings: TocHeading[];
  className?: string;
}) {
  const t = useTranslations("blog");
  const active = useActiveHeading(headings);
  return (
    <nav aria-label={t("toc")} data-testid="toc-sidebar" className={cn("sticky top-24", className)}>
      <p className="mb-3 text-eyebrow text-muted-foreground uppercase">{t("toc")}</p>
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-border">
        <TocList headings={headings} active={active} />
      </div>
    </nav>
  );
}

export function TocDetails({
  headings,
  className,
}: {
  headings: TocHeading[];
  className?: string;
}) {
  const t = useTranslations("blog");
  return (
    <details
      data-testid="toc-details"
      className={cn("group rounded-xl border border-border bg-card", className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ListTree aria-hidden className="h-4 w-4 text-link" />
        {t("toc")}
        <ChevronDown
          aria-hidden
          className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <nav aria-label={t("toc")} className="border-t border-border px-4 py-3">
        <div className="border-l border-border">
          <TocList headings={headings} />
        </div>
      </nav>
    </details>
  );
}
