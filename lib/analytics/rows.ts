import "server-only";
import type { AnalyticsEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aggregate, type Dimension, type StatRow } from "./aggregate";
import { lastAggregatedDay, loadRaw } from "./job";
import { addDays, fromDay, toDay } from "./range";

export interface EntityScope {
  entityType: AnalyticsEntityType;
  entityKey: string;
}

/**
 * Daily rows for [from, to] (inclusive UTC days): `DailyStat` for aggregated days, the same
 * aggregation over raw rows for the days after the last aggregated one (today, and yesterday
 * before the nightly job). With `scope`, only that entity's rows (site rows excluded).
 */
export async function loadRows(from: string, to: string, scope?: EntityScope): Promise<StatRow[]> {
  const last = await lastAggregatedDay();
  const rawFrom = last && addDays(last, 1) > from ? addDays(last, 1) : from;

  const statRows =
    rawFrom > from
      ? await prisma.dailyStat.findMany({
          where: {
            date: {
              gte: fromDay(from),
              lte: fromDay(addDays(rawFrom, -1) < to ? addDays(rawFrom, -1) : to),
            },
            ...(scope ? { entityType: scope.entityType, entityKey: scope.entityKey } : {}),
          },
        })
      : [];

  const rows: StatRow[] = statRows.map((row) => ({
    date: toDay(row.date),
    entityType: row.entityType,
    entityKey: row.entityKey,
    dimension: row.dimension as Dimension,
    value: row.value,
    views: row.views,
    visitors: row.visitors,
  }));

  if (rawFrom <= to) {
    const { views, clicks } = await loadRaw(rawFrom, addDays(to, 1));
    for (const row of aggregate(views, clicks)) {
      if (row.date < rawFrom || row.date > to) continue;
      if (scope && (row.entityType !== scope.entityType || row.entityKey !== scope.entityKey)) {
        continue;
      }
      rows.push(row);
    }
  }
  return rows;
}
