"use client";

import { useTranslations } from "next-intl";
import { ExportButton } from "@/components/admin/analytics/export-button";
import { RangePicker } from "@/components/admin/analytics/range-picker";
import { TrafficKpis, TrafficSections } from "@/components/admin/analytics/traffic";
import type { TrafficOverview } from "@/lib/analytics/queries";
import type { RangeWithPrevious } from "@/lib/analytics/range";

export default function AnalyticsOverviewClient({
  traffic,
  range,
  today,
}: {
  traffic: TrafficOverview;
  range: RangeWithPrevious;
  today: string;
}) {
  const t = useTranslations("analytics");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("rangeSummary", { from: range.from, to: range.to })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker range={range} today={today} />
          <ExportButton scope={{ scope: "site" }} />
        </div>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        <TrafficKpis traffic={traffic} />
      </section>
      <TrafficSections traffic={traffic} topTitle={t("allContent")} />
      <p className="text-xs text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}
