"use client";

import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/analytics/colors";
import { shortDay } from "@/lib/analytics/format";
import type { SeriesPoint } from "@/lib/analytics/report";

/** Daily views and visitors, with the previous period's views as a dashed line. */
export function ViewsChart({
  series,
  previous,
}: {
  series: SeriesPoint[];
  previous?: SeriesPoint[];
}) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const config = {
    views: { label: t("views"), color: CHART_COLORS.violet },
    visitors: { label: t("visitors"), color: CHART_COLORS.cyan },
    previousViews: { label: t("previousViews"), color: CHART_COLORS.muted },
  } satisfies ChartConfig;

  const data = series.map((point, i) => ({
    date: point.date,
    views: point.views,
    visitors: point.visitors,
    previousViews: previous?.[i]?.views ?? null,
  }));
  const empty = series.every((point) => point.views === 0);

  return (
    <div className="relative" data-testid="views-chart" data-empty={empty || undefined}>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fill-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(value: string) => shortDay(value, locale)}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={(value) => shortDay(String(value), locale)} />
            }
          />
          {previous && (
            <Line
              dataKey="previousViews"
              type="monotone"
              stroke="var(--color-previousViews)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Area
            dataKey="views"
            type="monotone"
            stroke="var(--color-views)"
            fill="url(#fill-views)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            dataKey="visitors"
            type="monotone"
            stroke="var(--color-visitors)"
            fill="transparent"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
      {empty && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {t("noData")}
        </p>
      )}
    </div>
  );
}
