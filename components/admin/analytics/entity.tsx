"use client";

import {
  ArrowLeft,
  Eye,
  ExternalLink,
  Heart,
  Hourglass,
  MessageSquare,
  ScrollText,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatNumber } from "@/lib/analytics/format";
import type { EntityAnalytics } from "@/lib/analytics/queries";
import type { RangeWithPrevious } from "@/lib/analytics/range";
import { BarList } from "./bar-list";
import { ExportButton } from "./export-button";
import { KpiCard } from "./kpi-card";
import { useBreakdownItems, useTypeLabel } from "./labels";
import { RangePicker } from "./range-picker";
import { BreakdownGrid, Panel } from "./traffic";
import { ViewsChart } from "./views-chart";

/** One entity's analysis: `/admin/analytics/[type]/[id]` and `/admin/analytics/pages`. */
export function EntityAnalyticsView({
  data,
  range,
  today,
  exportScope,
}: {
  data: EntityAnalytics;
  range: RangeWithPrevious;
  today: string;
  exportScope: Record<string, string>;
}) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const typeLabel = useTypeLabel();
  const items = useBreakdownItems();
  const n = (value: number | null) => formatNumber(value, locale);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/analytics"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Badge variant="secondary" className="mb-2">
            {typeLabel(data.entityType)}
          </Badge>
          <h1 className="mb-1 truncate text-3xl font-bold" data-testid="entity-title">
            {data.label}
          </h1>
          <a
            href={`/${locale}${data.publicPath === "/" ? "" : data.publicPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
          >
            {data.publicPath} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker range={range} today={today} />
          <ExportButton scope={exportScope} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Eye}
          label={t("views")}
          value={n(data.views.value)}
          change={data.views.change}
          hint={t("previousValue", { value: n(data.views.previous) })}
        />
        <KpiCard
          icon={Users}
          label={t("visitors")}
          value={n(data.visitors.value)}
          change={data.visitors.change}
          hint={t("visitorsApprox")}
        />
        <KpiCard
          icon={Hourglass}
          label={data.entityType === "BLOG" ? t("avgReading") : t("avgEngaged")}
          value={formatDuration(data.avgEngagedSeconds.value)}
          change={data.avgEngagedSeconds.change}
        />
        <KpiCard
          icon={ScrollText}
          label={t("avgScroll")}
          value={data.avgScroll.value === null ? "–" : `${Math.round(data.avgScroll.value)}%`}
          change={data.avgScroll.change}
        />
        {data.interactions && (
          <>
            <KpiCard
              icon={Heart}
              label={t("likesInRange")}
              value={n(data.interactions.likes.value)}
              change={data.interactions.likes.change}
              hint={t("allTime", { value: n(data.interactions.totalLikes) })}
            />
            <KpiCard
              icon={MessageSquare}
              label={t("commentsInRange")}
              value={n(data.interactions.comments.value)}
              change={data.interactions.comments.change}
              hint={t("allTime", { value: n(data.interactions.totalComments) })}
              href="/admin/comments"
            />
          </>
        )}
      </section>

      <Panel title={t("viewsOverTime")}>
        <ViewsChart series={data.series} previous={data.previousSeries} />
      </Panel>

      <BreakdownGrid
        breakdowns={data.breakdowns}
        extra={
          <>
            <Panel title={t("cameFrom")}>
              <BarList items={items("from", data.from.slice(0, 20))} />
            </Panel>
            {data.entityType !== "SKILL" &&
              data.entityType !== "HOME" &&
              data.entityType !== "PAGE" && (
                <Panel title={t("fromSkills")}>
                  <BarList
                    items={data.fromSkills.map((item) => ({
                      key: item.value,
                      label: item.label,
                      views: item.views,
                      visitors: item.visitors,
                    }))}
                  />
                  {data.skills.length > 0 && (
                    <div className="mt-4 border-t border-border/40 pt-3">
                      <p className="mb-2 text-xs text-muted-foreground">{t("contentSkills")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.skills.map((skill) => (
                          <Link key={skill.id} href={skill.href}>
                            <Badge variant="outline" className="hover:bg-accent">
                              {skill.label}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>
              )}
          </>
        }
      />
      <p className="text-xs text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}
