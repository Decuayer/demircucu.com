import "server-only";
import { prisma } from "@/lib/prisma";
import {
  aggregate,
  SITE_ENTITY,
  siteMarker,
  type RawClick,
  type RawView,
  type StatRow,
} from "./aggregate";
import { addDays, fromDay, toDay } from "./range";
import { deleteOldSalts } from "./salt";

/** Raw page views and clicks are kept this many days; `DailyStat` is kept forever. */
export const RAW_RETENTION_DAYS = 90;
/** Days caught up in one run if the job did not run for a while. */
export const MAX_CATCH_UP_DAYS = RAW_RETENTION_DAYS + 5;
/** Arbitrary constant for `pg_advisory_xact_lock`: one aggregation at a time. */
const LOCK_KEY = 7_004_001;

export const rawViewSelect = {
  id: true,
  createdAt: true,
  path: true,
  locale: true,
  entityType: true,
  entityId: true,
  referrerHost: true,
  utmSource: true,
  country: true,
  deviceType: true,
  browser: true,
  os: true,
  visitorHash: true,
  sessionId: true,
  durationMs: true,
  scrollDepth: true,
} as const;

/** Raw rows created in [from, to) (UTC days). */
export async function loadRaw(
  from: string,
  toExclusive: string,
  db: Pick<typeof prisma, "pageView" | "outboundClick"> = prisma,
): Promise<{ views: RawView[]; clicks: RawClick[] }> {
  const createdAt = { gte: fromDay(from), lt: fromDay(toExclusive) };
  const [views, clickRows] = await Promise.all([
    db.pageView.findMany({ where: { createdAt }, select: rawViewSelect }),
    db.outboundClick.findMany({
      where: { createdAt },
      select: {
        createdAt: true,
        entityType: true,
        entityId: true,
        target: true,
        visitorHash: true,
        pageView: { select: { path: true } },
      },
    }),
  ]);
  const clicks = clickRows.map(({ pageView, ...click }) => ({
    ...click,
    path: pageView?.path ?? null,
  }));
  return { views, clicks };
}

/** Latest day with a `DailyStat` site row (every aggregated day has one), or null. */
export async function lastAggregatedDay(): Promise<string | null> {
  const row = await prisma.dailyStat.findFirst({
    where: { ...SITE_ENTITY, dimension: "total", value: "" },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row ? toDay(row.date) : null;
}

export interface AggregationResult {
  aggregatedDays: string[];
  deletedViews: number;
  deletedClicks: number;
  deletedSalts: number;
  /** Blog posts whose `viewCount` grew. */
  updatedPosts: number;
}

async function aggregateDay(day: string): Promise<{ done: boolean; posts: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    const marker = await tx.dailyStat.findFirst({
      where: { date: fromDay(day), ...SITE_ENTITY, dimension: "total", value: "" },
      select: { date: true },
    });
    if (marker) return { done: false, posts: 0 };

    const { views, clicks } = await loadRaw(day, addDays(day, 1), tx);
    const rows: StatRow[] = aggregate(views, clicks).filter((row) => row.date === day);
    const hasSite = rows.some(
      (row) =>
        row.entityType === SITE_ENTITY.entityType &&
        row.entityKey === SITE_ENTITY.entityKey &&
        row.dimension === "total",
    );
    if (!hasSite) rows.push(siteMarker(day));
    await tx.dailyStat.createMany({
      data: rows.map((row) => ({ ...row, date: fromDay(row.date) })),
    });

    // viewCount keeps its earlier (pre-analytics) value and grows by each aggregated day.
    let posts = 0;
    for (const row of rows) {
      if (row.entityType !== "BLOG" || row.dimension !== "total" || row.views === 0) continue;
      const { count } = await tx.blogPost.updateMany({
        where: { id: row.entityKey },
        data: { viewCount: { increment: row.views } },
      });
      posts += count;
    }
    return { done: true, posts };
  });
}

/**
 * Nightly job: aggregates every finished day that has no `DailyStat` rows yet (idempotent,
 * catches up after missed runs), deletes raw rows past retention (only days already
 * aggregated) and salts of past days.
 */
export async function runDailyAggregation(now: Date): Promise<AggregationResult> {
  const today = toDay(now);
  const yesterday = addDays(today, -1);
  const last = await lastAggregatedDay();

  let start: string;
  if (last) {
    start = addDays(last, 1);
  } else {
    const [firstView, firstClick] = await Promise.all([
      prisma.pageView.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.outboundClick.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);
    const first = [firstView?.createdAt, firstClick?.createdAt]
      .filter((date): date is Date => Boolean(date))
      .map(toDay)
      .sort()[0];
    start = first && first < yesterday ? first : yesterday;
  }
  const earliest = addDays(today, -MAX_CATCH_UP_DAYS);
  if (start < earliest) start = earliest;

  const aggregatedDays: string[] = [];
  let updatedPosts = 0;
  for (let day = start; day <= yesterday; day = addDays(day, 1)) {
    const result = await aggregateDay(day);
    if (result.done) aggregatedDays.push(day);
    updatedPosts += result.posts;
  }

  // Raw rows go only once their day is aggregated, never before the retention cutoff.
  const aggregatedUntil = await lastAggregatedDay();
  let deletedViews = 0;
  let deletedClicks = 0;
  if (aggregatedUntil) {
    const retentionStart = addDays(today, -RAW_RETENTION_DAYS);
    const firstUnaggregated = addDays(aggregatedUntil, 1);
    const cutoff = fromDay(retentionStart < firstUnaggregated ? retentionStart : firstUnaggregated);
    deletedClicks = (
      await prisma.outboundClick.deleteMany({ where: { createdAt: { lt: cutoff } } })
    ).count;
    deletedViews = (await prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } }))
      .count;
  }
  const deletedSalts = await deleteOldSalts(now);

  return { aggregatedDays, deletedViews, deletedClicks, deletedSalts, updatedPosts };
}
