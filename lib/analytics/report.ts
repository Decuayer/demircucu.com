import type { AnalyticsEntityType } from "@prisma/client";
import { SITE_ENTITY, type Dimension, type StatRow } from "./aggregate";

/**
 * Reductions over daily rows for the dashboard. Pure; the rows come from `DailyStat` plus the
 * same aggregation applied to raw rows of days that are not aggregated yet.
 */

export interface EntityRef {
  entityType: AnalyticsEntityType;
  entityKey: string;
}

export interface Count {
  views: number;
  visitors: number;
}

export interface SeriesPoint extends Count {
  date: string;
}

export interface BreakdownItem extends Count {
  value: string;
}

export interface EntityCount extends Count, EntityRef {}

const matches = (row: StatRow, entity: EntityRef) =>
  row.entityType === entity.entityType && row.entityKey === entity.entityKey;

const isSite = (row: { entityType: AnalyticsEntityType; entityKey: string }) =>
  row.entityType === SITE_ENTITY.entityType && row.entityKey === SITE_ENTITY.entityKey;

function pick(rows: readonly StatRow[], entity: EntityRef, dimension: Dimension, value?: string) {
  return rows.filter(
    (row) =>
      matches(row, entity) &&
      row.dimension === dimension &&
      (value === undefined || row.value === value),
  );
}

function sum(rows: readonly StatRow[]): Count {
  return rows.reduce(
    (total, row) => ({ views: total.views + row.views, visitors: total.visitors + row.visitors }),
    { views: 0, visitors: 0 },
  );
}

/**
 * Views and visitors. Visitor hashes rotate daily, so visitors over several days is the sum of
 * daily unique visitors (a visitor who returns on two days counts twice).
 */
export function totals(rows: readonly StatRow[], entity: EntityRef = SITE_ENTITY): Count {
  return sum(pick(rows, entity, "total", ""));
}

/** One point per day of `days`; days without data are zero. */
export function series(
  rows: readonly StatRow[],
  days: readonly string[],
  entity: EntityRef = SITE_ENTITY,
): SeriesPoint[] {
  const byDay = new Map<string, Count>();
  for (const row of pick(rows, entity, "total", "")) {
    const current = byDay.get(row.date) ?? { views: 0, visitors: 0 };
    byDay.set(row.date, {
      views: current.views + row.views,
      visitors: current.visitors + row.visitors,
    });
  }
  return days.map((date) => ({ date, ...(byDay.get(date) ?? { views: 0, visitors: 0 }) }));
}

/** Values of one dimension, most viewed first. */
export function breakdown(
  rows: readonly StatRow[],
  dimension: Dimension,
  entity: EntityRef = SITE_ENTITY,
  limit = Infinity,
): BreakdownItem[] {
  const byValue = new Map<string, Count>();
  for (const row of pick(rows, entity, dimension)) {
    const current = byValue.get(row.value) ?? { views: 0, visitors: 0 };
    byValue.set(row.value, {
      views: current.views + row.views,
      visitors: current.visitors + row.visitors,
    });
  }
  return [...byValue.entries()]
    .map(([value, count]) => ({ value, ...count }))
    .sort((a, b) => b.views - a.views || b.visitors - a.visitors || a.value.localeCompare(b.value))
    .slice(0, limit);
}

export interface Engagement {
  /** Average engaged seconds per measured view; null without measurements. */
  avgSeconds: number | null;
  /** Average scroll depth (0-100) per measured view; null without measurements. */
  avgScroll: number | null;
}

export function engagement(rows: readonly StatRow[], entity: EntityRef = SITE_ENTITY): Engagement {
  const average = (value: string) => {
    const { views, visitors } = sum(pick(rows, entity, "engagement", value));
    return views === 0 ? null : visitors / views;
  };
  return { avgSeconds: average("duration"), avgScroll: average("scroll") };
}

export interface Sessions {
  count: number;
  /** Average engaged seconds per session; null without sessions. */
  avgSeconds: number | null;
}

export function sessions(rows: readonly StatRow[]): Sessions {
  const { views, visitors } = sum(pick(rows, SITE_ENTITY, "session", ""));
  return { count: views, avgSeconds: views === 0 ? null : visitors / views };
}

/** Totals per entity (site totals excluded), most viewed first. */
export function entityTotals(
  rows: readonly StatRow[],
  entityType?: AnalyticsEntityType,
): EntityCount[] {
  const byEntity = new Map<string, EntityCount>();
  for (const row of rows) {
    if (row.dimension !== "total" || isSite(row)) continue;
    if (entityType && row.entityType !== entityType) continue;
    const key = `${row.entityType}\u0000${row.entityKey}`;
    const current = byEntity.get(key) ?? {
      entityType: row.entityType,
      entityKey: row.entityKey,
      views: 0,
      visitors: 0,
    };
    current.views += row.views;
    current.visitors += row.visitors;
    byEntity.set(key, current);
  }
  return [...byEntity.values()].sort(
    (a, b) => b.views - a.views || a.entityKey.localeCompare(b.entityKey),
  );
}

/** Views per content type (HOME and PAGE separate). */
export function viewsByType(
  rows: readonly StatRow[],
): { entityType: AnalyticsEntityType; views: number }[] {
  const byType = new Map<AnalyticsEntityType, number>();
  for (const entity of entityTotals(rows)) {
    byType.set(entity.entityType, (byType.get(entity.entityType) ?? 0) + entity.views);
  }
  return [...byType.entries()]
    .map(([entityType, views]) => ({ entityType, views }))
    .sort((a, b) => b.views - a.views);
}
