import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Page layout (phase 8 typography): one vertical rhythm for every public page. `PageShell` gives
 * the page padding (64px, 96px from md) and width; `PageHeader` the eyebrow pill, the page title
 * on the `h1` step of the type scale and an optional lead, 48px (64px from md) above the content.
 */

const WIDTHS = {
  article: "max-w-xl",
  narrow: "max-w-4xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
} as const;

export function PageShell({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("py-16 md:py-24", className)}>
      <div className={cn("container mx-auto px-4 md:px-6", WIDTHS[width])}>{children}</div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  lead,
  align = "center",
  className,
  children,
}: {
  /** Short label in the pill above the title. */
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
  /** Extra content under the lead (meta rows, actions). */
  children?: React.ReactNode;
}) {
  const center = align === "center";
  return (
    <header
      data-testid="page-header"
      className={cn("enter mb-12 md:mb-16", center && "text-center", className)}
    >
      {eyebrow && (
        <Badge
          variant="secondary"
          className="mb-4 h-7 gap-2 border-primary/40 bg-muted px-3 text-link"
        >
          {Icon && <Icon aria-hidden />}
          {eyebrow}
        </Badge>
      )}
      <h1 className="text-h1 text-balance">{title}</h1>
      {lead && (
        <p
          className={cn(
            "mt-4 max-w-2xl text-lead text-pretty text-muted-foreground",
            center && "mx-auto",
          )}
        >
          {lead}
        </p>
      )}
      {children}
    </header>
  );
}

/** Section title on the `h2` step, 24px above its content, with an optional icon tile. */
export function SectionHeading({
  icon: Icon,
  id,
  className,
  children,
}: {
  icon?: LucideIcon;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className={cn("mb-6 flex items-center gap-3 text-h2", className)}>
      {Icon && (
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"
        >
          <Icon className="h-5 w-5 text-link" />
        </span>
      )}
      {children}
    </h2>
  );
}
