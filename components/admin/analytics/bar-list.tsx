"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/analytics/format";

export interface BarListItem {
  key: string;
  label: string;
  views: number;
  visitors?: number;
  href?: string;
}

/** Ranked list with proportional bars; rows with `href` are links. */
export function BarList({ items, empty }: { items: BarListItem[]; empty?: string }) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty ?? t("noData")}</p>;
  }
  const max = Math.max(...items.map((item) => item.views), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const content = (
          <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
            <div
              className="absolute inset-y-0 left-0 rounded-md bg-muted"
              style={{ width: `${(item.views / max) * 100}%` }}
              aria-hidden
            />
            <span className="relative truncate">{item.label}</span>
            <span className="relative shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatNumber(item.views, locale)}
              {item.visitors !== undefined && (
                <span className="ml-2 text-muted-foreground">
                  {t("visitorsShort", { count: item.visitors })}
                </span>
              )}
            </span>
          </div>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="block rounded-md hover:bg-accent/50">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
