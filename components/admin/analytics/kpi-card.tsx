"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatChange } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Percent change from the previous period; omitted for values without a comparison. */
  change?: number | null;
  /** Shown under the value (for example the previous period's value). */
  hint?: string;
  href?: string;
}

export function KpiCard({ label, value, icon: Icon, change, hint, href }: KpiCardProps) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const changeText = change === undefined ? undefined : formatChange(change, locale);
  const Trend =
    change === undefined || change === null || Math.round(change) === 0
      ? Minus
      : change > 0
        ? ArrowUpRight
        : ArrowDownRight;

  const body = (
    <Card
      className={cn(
        "h-full border-border/50 bg-card/50 transition-colors",
        href && "hover:border-violet-500/30 hover:bg-card",
      )}
    >
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
            <Icon className="h-4 w-4 text-violet-400" />
          </div>
          {changeText !== undefined && (
            <span
              className={cn(
                "flex items-center text-xs font-medium",
                change === null || change === undefined || Math.round(change) === 0
                  ? "text-muted-foreground"
                  : change > 0
                    ? "text-green-400"
                    : "text-red-400",
              )}
              title={t("comparedToPrevious")}
            >
              <Trend className="mr-0.5 h-3 w-3" />
              {changeText ?? t("noComparison")}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
