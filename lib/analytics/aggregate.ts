import type { AnalyticsEntityType, DeviceType, OutboundTarget } from "@prisma/client";

/**
 * Daily aggregation, shared by the nightly job (writes `DailyStat`) and the dashboard (applies
 * the same function to raw rows of days that are not aggregated yet). Pure; days are UTC.
 *
 * Row conventions (also in docs/analytics.md):
 * - Entity key: the entity id for PROJECT, BLOG, EXPERIENCE and SKILL; the path for HOME and
 *   PAGE. Site totals use entity type PAGE with key "" (no page has an empty path).
 * - Dimensions: `total` (value ""), `referrer` (host, "" = direct or internal), `utm` (source),
 *   `country`, `device`, `browser`, `os`, `locale`, `from` (previous page in the session, "" for
 *   the first page), `outbound` (target; views = clicks), `engagement` (value `duration`: views =
 *   measured views, visitors = total seconds; value `scroll`: views = measured views, visitors =
 *   sum of depths), and for site totals only `session` (views = sessions, visitors = total
 *   seconds).
 * - `visitors` is the number of distinct daily visitor hashes, except for the measurement
 *   dimensions above.
 */

export const SITE_ENTITY = { entityType: "PAGE", entityKey: "" } as const;

export type Dimension =
  | "total"
  | "referrer"
  | "utm"
  | "country"
  | "device"
  | "browser"
  | "os"
  | "locale"
  | "from"
  | "outbound"
  | "engagement"
  | "session";

export const BREAKDOWN_DIMENSIONS = [
  "referrer",
  "utm",
  "country",
  "device",
  "browser",
  "os",
  "locale",
  "from",
] as const satisfies readonly Dimension[];

export interface StatRow {
  /** YYYY-MM-DD (UTC). */
  date: string;
  entityType: AnalyticsEntityType;
  entityKey: string;
  dimension: Dimension;
  value: string;
  views: number;
  visitors: number;
}

export interface RawView {
  id: string;
  createdAt: Date;
  path: string;
  locale: string;
  entityType: AnalyticsEntityType;
  entityId: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  country: string | null;
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
  visitorHash: string;
  sessionId: string | null;
  durationMs: number | null;
  scrollDepth: number | null;
}

export interface RawClick {
  createdAt: Date;
  entityType: AnalyticsEntityType;
  entityId: string | null;
  /** Path of the page view the click came from; used for HOME / PAGE entity keys. */
  path: string | null;
  target: OutboundTarget;
  visitorHash: string;
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function entityKeyOf(view: {
  entityType: AnalyticsEntityType;
  entityId: string | null;
  path: string | null;
}): string {
  if (view.entityType === "HOME") return "/";
  if (view.entityType === "PAGE") return view.path ?? "";
  return view.entityId ?? "";
}

class Bucket {
  views = 0;
  private readonly hashes = new Set<string>();
  sum = 0;
  add(hash: string) {
    this.views += 1;
    this.hashes.add(hash);
  }
  get visitors() {
    return this.hashes.size;
  }
}

class Accumulator {
  private readonly buckets = new Map<
    string,
    { row: Omit<StatRow, "views" | "visitors">; b: Bucket }
  >();

  bucket(
    date: string,
    entityType: AnalyticsEntityType,
    entityKey: string,
    dimension: Dimension,
    value: string,
  ): Bucket {
    const key = JSON.stringify([date, entityType, entityKey, dimension, value]);
    let entry = this.buckets.get(key);
    if (!entry) {
      entry = { row: { date, entityType, entityKey, dimension, value }, b: new Bucket() };
      this.buckets.set(key, entry);
    }
    return entry.b;
  }

  rows(measured: ReadonlySet<Dimension>): StatRow[] {
    return [...this.buckets.values()].map(({ row, b }) => ({
      ...row,
      views: b.views,
      visitors: measured.has(row.dimension) ? Math.round(b.sum) : b.visitors,
    }));
  }
}

const MEASURED = new Set<Dimension>(["engagement", "session"]);

/** Aggregates raw page views and outbound clicks into daily rows. */
export function aggregate(views: readonly RawView[], clicks: readonly RawClick[]): StatRow[] {
  const acc = new Accumulator();
  const fromPath = previousPaths(views);

  for (const view of views) {
    const date = utcDay(view.createdAt);
    const targets = [
      { entityType: view.entityType, entityKey: entityKeyOf(view) },
      SITE_ENTITY,
    ] as const;
    const values: Record<(typeof BREAKDOWN_DIMENSIONS)[number], string> = {
      referrer: view.referrerHost ?? "",
      utm: view.utmSource ?? "",
      country: view.country ?? "",
      device: view.deviceType,
      browser: view.browser ?? "",
      os: view.os ?? "",
      locale: view.locale,
      from: fromPath.get(view.id) ?? "",
    };
    for (const { entityType, entityKey } of targets) {
      acc.bucket(date, entityType, entityKey, "total", "").add(view.visitorHash);
      for (const dimension of BREAKDOWN_DIMENSIONS) {
        acc.bucket(date, entityType, entityKey, dimension, values[dimension]).add(view.visitorHash);
      }
      if (view.durationMs !== null) {
        const b = acc.bucket(date, entityType, entityKey, "engagement", "duration");
        b.add(view.visitorHash);
        b.sum += view.durationMs / 1000;
      }
      if (view.scrollDepth !== null) {
        const b = acc.bucket(date, entityType, entityKey, "engagement", "scroll");
        b.add(view.visitorHash);
        b.sum += view.scrollDepth;
      }
    }
  }

  for (const [date, sessions] of sessionsByDay(views)) {
    for (const seconds of sessions.values()) {
      const b = acc.bucket(date, SITE_ENTITY.entityType, SITE_ENTITY.entityKey, "session", "");
      b.views += 1;
      b.sum += seconds;
    }
  }

  for (const click of clicks) {
    const date = utcDay(click.createdAt);
    const own = { entityType: click.entityType, entityKey: entityKeyOf(click) };
    // A click on a static page whose view was not recorded (repeat view) has no path; it then
    // counts for the site only, never under the site key by accident.
    const targets = own.entityKey === "" ? [SITE_ENTITY] : [own, SITE_ENTITY];
    for (const { entityType, entityKey } of targets) {
      acc.bucket(date, entityType, entityKey, "outbound", click.target).add(click.visitorHash);
    }
  }

  return acc.rows(MEASURED);
}

/** Previous page of each view in its session (by time); views without a session have none. */
function previousPaths(views: readonly RawView[]): Map<string, string> {
  const bySession = new Map<string, RawView[]>();
  for (const view of views) {
    if (!view.sessionId) continue;
    const list = bySession.get(view.sessionId) ?? [];
    list.push(view);
    bySession.set(view.sessionId, list);
  }
  const result = new Map<string, string>();
  for (const list of bySession.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 1; i < list.length; i++) result.set(list[i]!.id, list[i - 1]!.path);
  }
  return result;
}

/** Per day: session id → engaged seconds (views without a session count as one each). */
function sessionsByDay(views: readonly RawView[]): Map<string, Map<string, number>> {
  const days = new Map<string, Map<string, number>>();
  for (const view of views) {
    const date = utcDay(view.createdAt);
    const sessions = days.get(date) ?? new Map<string, number>();
    const key = view.sessionId ?? `view:${view.id}`;
    sessions.set(key, (sessions.get(key) ?? 0) + (view.durationMs ?? 0) / 1000);
    days.set(date, sessions);
  }
  return days;
}

/** The zero row written for every aggregated day, so "this day is done" is always recorded. */
export function siteMarker(date: string): StatRow {
  return { date, ...SITE_ENTITY, dimension: "total", value: "", views: 0, visitors: 0 };
}
