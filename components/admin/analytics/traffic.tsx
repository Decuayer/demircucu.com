"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Timer, Users, MousePointerClick, Hourglass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHART_COLORS } from "@/lib/analytics/colors";
import { formatDuration, formatNumber } from "@/lib/analytics/format";
import type { TrafficOverview } from "@/lib/analytics/queries";
import { BarList } from "./bar-list";
import { KpiCard } from "./kpi-card";
import { useBreakdownItems, useTypeLabel, type BreakdownDimension } from "./labels";
import { ViewsChart } from "./views-chart";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-border/50 bg-card/50 ${className ?? ""}`}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Views, visitors, engagement and outbound click KPIs with period comparison. */
export function TrafficKpis({ traffic }: { traffic: TrafficOverview }) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  return (
    <>
      <KpiCard
        icon={Eye}
        label={t("views")}
        value={formatNumber(traffic.views.value, locale)}
        change={traffic.views.change}
        hint={t("previousValue", { value: formatNumber(traffic.views.previous, locale) })}
        href="/admin/analytics"
      />
      <KpiCard
        icon={Users}
        label={t("visitors")}
        value={formatNumber(traffic.visitors.value, locale)}
        change={traffic.visitors.change}
        hint={t("visitorsApprox")}
        href="/admin/analytics"
      />
      <KpiCard
        icon={Timer}
        label={t("avgSession")}
        value={formatDuration(traffic.avgSessionSeconds.value)}
        change={traffic.avgSessionSeconds.change}
        href="/admin/analytics"
      />
      <KpiCard
        icon={Hourglass}
        label={t("avgEngaged")}
        value={formatDuration(traffic.avgEngagedSeconds.value)}
        change={traffic.avgEngagedSeconds.change}
        href="/admin/analytics"
      />
      <KpiCard
        icon={MousePointerClick}
        label={t("outboundClicks")}
        value={formatNumber(traffic.outboundClicks.value, locale)}
        change={traffic.outboundClicks.change}
        href="/admin/analytics"
      />
    </>
  );
}

function TypeChart({ data }: { data: TrafficOverview["byType"] }) {
  const t = useTranslations("analytics");
  const typeLabel = useTypeLabel();
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("noData")}</p>;
  }
  const config = { views: { label: t("views"), color: CHART_COLORS.violet } } satisfies ChartConfig;
  const rows = data.map((item) => ({ type: typeLabel(item.entityType), views: item.views }));
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full" data-testid="type-chart">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={96} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="views" radius={4} isAnimationActive={false}>
          {rows.map((row, i) => (
            <Cell key={row.type} fill={CHART_COLORS.palette[i % CHART_COLORS.palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const TOP_TABS = ["PROJECT", "BLOG", "EXPERIENCE", "SKILL", "PAGE"] as const;

function TopContent({ top }: { top: TrafficOverview["top"] }) {
  const typeLabel = useTypeLabel();
  return (
    <Tabs defaultValue="PROJECT">
      <TabsList className="mb-3 flex-wrap">
        {TOP_TABS.map((type) => (
          <TabsTrigger key={type} value={type}>
            {typeLabel(type)}
          </TabsTrigger>
        ))}
      </TabsList>
      {TOP_TABS.map((type) => (
        <TabsContent key={type} value={type}>
          <BarList
            items={top[type].map((item) => ({
              key: `${item.entityType}:${item.entityKey}`,
              label: item.label,
              views: item.views,
              visitors: item.visitors,
              href: item.href,
            }))}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

const BREAKDOWN_PANELS: { dimension: BreakdownDimension; key: string }[] = [
  { dimension: "referrer", key: "referrers" },
  { dimension: "country", key: "countries" },
  { dimension: "device", key: "devices" },
  { dimension: "browser", key: "browsers" },
  { dimension: "os", key: "systems" },
  { dimension: "locale", key: "languages" },
  { dimension: "utm", key: "campaigns" },
  { dimension: "outbound", key: "outbound.title" },
];

export function BreakdownGrid({
  breakdowns,
  extra,
}: {
  breakdowns: TrafficOverview["breakdowns"];
  extra?: ReactNode;
}) {
  const t = useTranslations("analytics");
  const items = useBreakdownItems();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {extra}
      {BREAKDOWN_PANELS.map(({ dimension, key }) => (
        <Panel key={dimension} title={t(key as "referrers")}>
          <BarList items={items(dimension, breakdowns[dimension as keyof typeof breakdowns])} />
        </Panel>
      ))}
    </div>
  );
}

/** Time series, content types, top content and breakdowns. */
export function TrafficSections({
  traffic,
  topTitle,
  topAction,
}: {
  traffic: TrafficOverview;
  topTitle?: string;
  topAction?: ReactNode;
}) {
  const t = useTranslations("analytics");
  return (
    <div className="space-y-4">
      <Panel title={t("viewsOverTime")}>
        <ViewsChart series={traffic.series} previous={traffic.previousSeries} />
      </Panel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={t("byType")}>
          <TypeChart data={traffic.byType} />
        </Panel>
        <Panel title={topTitle ?? t("topContent")} action={topAction} className="lg:col-span-2">
          <TopContent top={traffic.top} />
        </Panel>
      </div>
      <BreakdownGrid breakdowns={traffic.breakdowns} />
    </div>
  );
}
