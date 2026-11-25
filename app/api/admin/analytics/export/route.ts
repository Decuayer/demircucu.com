import type { NextRequest } from "next/server";
import { AuthorizationError } from "@/lib/auth/errors";
import { requireAdmin } from "@/lib/auth/guards";
import { toCsv } from "@/lib/analytics/csv";
import {
  entityTypeFromSegment,
  getAnalyticsOverview,
  getEntityAnalytics,
  type Breakdowns,
} from "@/lib/analytics/queries";
import { parseRange } from "@/lib/analytics/range";
import type { BreakdownItem, SeriesPoint } from "@/lib/analytics/report";

type Row = (string | number | null)[];

function seriesRows(series: SeriesPoint[]): Row[] {
  return series.map((point) => ["daily", point.date, "", point.views, point.visitors]);
}

function breakdownRows(section: string, items: BreakdownItem[]): Row[] {
  return items.map((item) => [section, item.value, "", item.views, item.visitors]);
}

function allBreakdowns(breakdowns: Breakdowns): Row[] {
  return (Object.keys(breakdowns) as (keyof Breakdowns)[]).flatMap((key) =>
    breakdownRows(key, breakdowns[key]),
  );
}

/** CSV of the dashboard view: `?scope=site|page|project|blog|experience|skill&key=&range=`. */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
  } catch (failure) {
    if (failure instanceof AuthorizationError) {
      return new Response(null, { status: failure.code === "unauthenticated" ? 401 : 403 });
    }
    throw failure;
  }

  const params = request.nextUrl.searchParams;
  const range = parseRange(
    {
      range: params.get("range") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
    },
    new Date(),
  );
  const locale = params.get("locale") === "en" ? "en" : "tr";
  const scope = params.get("scope") ?? "site";
  const key = params.get("key") ?? "";
  const header: Row = ["section", "key", "label", "views", "visitors"];
  let rows: Row[];

  if (scope === "site") {
    const traffic = await getAnalyticsOverview(range, locale);
    const content = Object.values(traffic.top).flatMap((items) =>
      items.map((item): Row => [
        `content:${item.entityType.toLowerCase()}`,
        item.entityKey,
        item.label,
        item.views,
        item.visitors,
      ]),
    );
    rows = [...seriesRows(traffic.series), ...content, ...allBreakdowns(traffic.breakdowns)];
  } else {
    const entityType = scope === "page" ? "PAGE" : entityTypeFromSegment(scope);
    if (!entityType || !key) return new Response(null, { status: 400 });
    const data = await getEntityAnalytics(entityType, key, range, locale);
    if (!data) return new Response(null, { status: 404 });
    rows = [
      ["entity", data.entityKey, data.label, data.views.value, data.visitors.value],
      ...seriesRows(data.series),
      ...allBreakdowns(data.breakdowns),
      ...breakdownRows("from", data.from),
    ];
  }

  const name = `analytics-${scope}-${range.from}-${range.to}.csv`.replace(/[^\w.-]/g, "_");
  return new Response(toCsv([header, ...rows]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
