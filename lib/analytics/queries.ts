import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { AnalyticsEntityType, SyncRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { SITE_ENTITY, type StatRow } from "./aggregate";
import { eachDay, fromDay, addDays, percentChange, type RangeWithPrevious } from "./range";
import {
  breakdown,
  engagement,
  entityTotals,
  series,
  sessions,
  totals,
  viewsByType,
  type BreakdownItem,
  type Count,
  type SeriesPoint,
} from "./report";
import { loadRows, type EntityScope } from "./rows";

/** Cache tag of dashboard reads; short-lived anyway (see `cachedRows`). */
export const ANALYTICS_CACHE_TAG = "analytics";

/** Dashboard reads are cached for a minute per range: fresh enough, cheap on refresh. */
async function cachedRows(
  from: string,
  to: string,
  entityType?: AnalyticsEntityType,
  entityKey?: string,
): Promise<StatRow[]> {
  "use cache";
  cacheTag(ANALYTICS_CACHE_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  return loadRows(from, to, entityType ? { entityType, entityKey: entityKey ?? "" } : undefined);
}

export type ContentType = Exclude<AnalyticsEntityType, "HOME" | "PAGE">;
export const CONTENT_TYPES = [
  "PROJECT",
  "BLOG",
  "EXPERIENCE",
  "SKILL",
] as const satisfies readonly ContentType[];

/** URL segment of an entity type on the analytics detail pages. */
export const ENTITY_SEGMENTS: Record<ContentType, string> = {
  PROJECT: "project",
  BLOG: "blog",
  EXPERIENCE: "experience",
  SKILL: "skill",
};

export function entityTypeFromSegment(segment: string): ContentType | null {
  const match = Object.entries(ENTITY_SEGMENTS).find(([, value]) => value === segment);
  return match ? (match[0] as ContentType) : null;
}

/** Admin page with the analysis of one entity. */
export function analyticsHref(entityType: AnalyticsEntityType, entityKey: string): string {
  if (entityType === "HOME" || entityType === "PAGE") {
    return `/admin/analytics/pages?path=${encodeURIComponent(entityKey)}`;
  }
  return `/admin/analytics/${ENTITY_SEGMENTS[entityType]}/${encodeURIComponent(entityKey)}`;
}

export interface Metric {
  value: number | null;
  previous: number | null;
  /** Percent change from the previous period; null when it cannot be computed. */
  change: number | null;
}

function metric(value: number | null, previous: number | null): Metric {
  return {
    value,
    previous,
    change: value === null || previous === null ? null : percentChange(value, previous),
  };
}

export interface LabeledEntity extends Count {
  entityType: AnalyticsEntityType;
  entityKey: string;
  label: string;
  href: string;
}

type Locale = "tr" | "en";

/** Display names of the entities in `rows` (missing content keeps its key). */
async function labelEntities(
  items: { entityType: AnalyticsEntityType; entityKey: string }[],
  locale: Locale,
): Promise<Map<string, string>> {
  const ids = (type: AnalyticsEntityType) =>
    items.filter((item) => item.entityType === type).map((item) => item.entityKey);
  const [projects, posts, experiences, tags] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: ids("PROJECT") } },
      select: { id: true, titleTr: true, titleEn: true, slug: true },
    }),
    prisma.blogPost.findMany({
      where: { id: { in: ids("BLOG") } },
      select: { id: true, titleTr: true, titleEn: true },
    }),
    prisma.experience.findMany({
      where: { id: { in: ids("EXPERIENCE") } },
      select: { id: true, company: true, positionTr: true, positionEn: true },
    }),
    prisma.tag.findMany({
      where: { id: { in: ids("SKILL") } },
      select: { id: true, name: true, nameTr: true, nameEn: true },
    }),
  ]);
  const tr = locale === "tr";
  const labels = new Map<string, string>();
  for (const p of projects) {
    labels.set(`PROJECT:${p.id}`, (tr ? p.titleTr || p.titleEn : p.titleEn || p.titleTr) || p.slug);
  }
  for (const p of posts)
    labels.set(`BLOG:${p.id}`, tr ? p.titleTr || p.titleEn : p.titleEn || p.titleTr);
  for (const e of experiences) {
    labels.set(`EXPERIENCE:${e.id}`, `${e.company} · ${tr ? e.positionTr : e.positionEn}`);
  }
  for (const t of tags) labels.set(`SKILL:${t.id}`, (tr ? t.nameTr : t.nameEn) || t.name);
  return labels;
}

async function labeled(
  items: { entityType: AnalyticsEntityType; entityKey: string; views: number; visitors: number }[],
  locale: Locale,
): Promise<LabeledEntity[]> {
  const labels = await labelEntities(items, locale);
  return items.map((item) => ({
    ...item,
    label: labels.get(`${item.entityType}:${item.entityKey}`) ?? item.entityKey,
    href: analyticsHref(item.entityType, item.entityKey),
  }));
}

export interface Breakdowns {
  referrer: BreakdownItem[];
  utm: BreakdownItem[];
  country: BreakdownItem[];
  device: BreakdownItem[];
  browser: BreakdownItem[];
  os: BreakdownItem[];
  locale: BreakdownItem[];
  outbound: BreakdownItem[];
}

function breakdowns(rows: StatRow[], scope: EntityScope, limit: number): Breakdowns {
  return {
    referrer: breakdown(rows, "referrer", scope, limit),
    utm: breakdown(rows, "utm", scope, limit).filter((item) => item.value !== ""),
    country: breakdown(rows, "country", scope, limit),
    device: breakdown(rows, "device", scope, limit),
    browser: breakdown(rows, "browser", scope, limit),
    os: breakdown(rows, "os", scope, limit),
    locale: breakdown(rows, "locale", scope, limit),
    outbound: breakdown(rows, "outbound", scope, limit),
  };
}

export interface TrafficOverview {
  views: Metric;
  visitors: Metric;
  avgSessionSeconds: Metric;
  avgEngagedSeconds: Metric;
  outboundClicks: Metric;
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  byType: { entityType: AnalyticsEntityType; views: number }[];
  /** Per content type (PAGE includes the home page), most viewed first. */
  top: Record<ContentType | "PAGE", LabeledEntity[]>;
  breakdowns: Breakdowns;
}

async function trafficOverview(
  range: RangeWithPrevious,
  locale: Locale,
  limit: number,
): Promise<TrafficOverview> {
  const [current, previous] = await Promise.all([
    cachedRows(range.from, range.to),
    cachedRows(range.previous.from, range.previous.to),
  ]);
  const now = totals(current);
  const before = totals(previous);
  const outbound = (rows: StatRow[]) =>
    breakdown(rows, "outbound").reduce((total, item) => total + item.views, 0);

  const all = entityTotals(current);
  const top = {} as TrafficOverview["top"];
  for (const type of [...CONTENT_TYPES, "PAGE"] as const) {
    const items = all
      .filter((item) =>
        type === "PAGE"
          ? item.entityType === "PAGE" || item.entityType === "HOME"
          : item.entityType === type,
      )
      .slice(0, limit);
    top[type] = await labeled(items, locale);
  }

  return {
    views: metric(now.views, before.views),
    visitors: metric(now.visitors, before.visitors),
    avgSessionSeconds: metric(sessions(current).avgSeconds, sessions(previous).avgSeconds),
    avgEngagedSeconds: metric(engagement(current).avgSeconds, engagement(previous).avgSeconds),
    outboundClicks: metric(outbound(current), outbound(previous)),
    series: series(current, eachDay(range.from, range.to)),
    previousSeries: series(previous, eachDay(range.previous.from, range.previous.to)),
    byType: viewsByType(current),
    top,
    breakdowns: breakdowns(current, SITE_ENTITY, limit),
  };
}

export interface SyncRunSummary {
  id: string;
  trigger: string;
  scope: string | null;
  status: SyncRunStatus;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
}

export interface DashboardData {
  traffic: TrafficOverview;
  content: {
    projects: number;
    posts: number;
    experiences: number;
    skills: number;
    comments: number;
    likes: number;
    unreadMessages: number;
  };
  lastSync: SyncRunSummary | null;
  recent: {
    messages: {
      id: string;
      name: string;
      subject: string | null;
      read: boolean;
      createdAt: Date;
    }[];
    comments: {
      id: string;
      content: string;
      hidden: boolean;
      createdAt: Date;
      author: string;
      postTitle: string;
    }[];
    syncRuns: SyncRunSummary[];
  };
}

const syncRunSelect = {
  id: true,
  trigger: true,
  scope: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  error: true,
} as const;

/** Everything `/admin` shows. Admin only. */
export async function getDashboard(
  range: RangeWithPrevious,
  locale: Locale,
): Promise<DashboardData> {
  await requireAdmin();
  const [
    traffic,
    projects,
    posts,
    experiences,
    skills,
    comments,
    likes,
    unreadMessages,
    runs,
    messages,
    recentComments,
  ] = await Promise.all([
    trafficOverview(range, locale, 5),
    prisma.project.count({ where: { published: true } }),
    prisma.blogPost.count({ where: { published: true } }),
    prisma.experience.count({ where: { published: true } }),
    prisma.tag.count({ where: { isSkill: true, hidden: false } }),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.githubSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: syncRunSelect,
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, subject: true, read: true, createdAt: true },
    }),
    prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        hidden: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
        post: { select: { titleTr: true, titleEn: true } },
      },
    }),
  ]);
  const tr = locale === "tr";
  return {
    traffic,
    content: { projects, posts, experiences, skills, comments, likes, unreadMessages },
    lastSync: runs[0] ?? null,
    recent: {
      messages,
      comments: recentComments.map((comment) => ({
        id: comment.id,
        content: comment.content.slice(0, 140),
        hidden: comment.hidden,
        createdAt: comment.createdAt,
        author: comment.author.name || comment.author.email.split("@")[0]!,
        postTitle: (tr ? comment.post.titleTr : comment.post.titleEn) || comment.post.titleTr,
      })),
      syncRuns: runs,
    },
  };
}

/** `/admin/analytics`: the same traffic overview with every entity listed. Admin only. */
export async function getAnalyticsOverview(range: RangeWithPrevious, locale: Locale) {
  await requireAdmin();
  return trafficOverview(range, locale, 500);
}

export interface EntityAnalytics {
  entityType: AnalyticsEntityType;
  entityKey: string;
  label: string;
  /** Public page, without the locale prefix. */
  publicPath: string;
  views: Metric;
  visitors: Metric;
  avgEngagedSeconds: Metric;
  avgScroll: Metric;
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  breakdowns: Breakdowns;
  /** Previous page in the session (internal navigation); "" is the session's first page. */
  from: BreakdownItem[];
  /** Views that came from a skill page, per skill. */
  fromSkills: (BreakdownItem & { label: string })[];
  /** Skills of the content (none for pages and skills). */
  skills: { id: string; label: string; href: string }[];
  /** Blog posts only. */
  interactions: {
    likes: Metric;
    comments: Metric;
    totalLikes: number;
    totalComments: number;
  } | null;
}

interface EntityMeta {
  label: string;
  publicPath: string;
  tagIds: string[];
}

async function entityMeta(
  entityType: AnalyticsEntityType,
  entityKey: string,
  locale: Locale,
): Promise<EntityMeta | null> {
  const tr = locale === "tr";
  const tagIds = (rows: { tagId: string; hidden: boolean }[]) =>
    rows.filter((row) => !row.hidden).map((row) => row.tagId);
  switch (entityType) {
    case "HOME":
      return { label: "/", publicPath: "/", tagIds: [] };
    case "PAGE":
      return entityKey.startsWith("/")
        ? { label: entityKey, publicPath: entityKey, tagIds: [] }
        : null;
    case "PROJECT": {
      const row = await prisma.project.findUnique({
        where: { id: entityKey },
        select: {
          slug: true,
          titleTr: true,
          titleEn: true,
          tags: { select: { tagId: true, hidden: true } },
        },
      });
      return row
        ? {
            label: (tr ? row.titleTr || row.titleEn : row.titleEn || row.titleTr) || row.slug,
            publicPath: `/projects/${row.slug}`,
            tagIds: tagIds(row.tags),
          }
        : null;
    }
    case "BLOG": {
      const row = await prisma.blogPost.findUnique({
        where: { id: entityKey },
        select: {
          slug: true,
          titleTr: true,
          titleEn: true,
          tags: { select: { tagId: true, hidden: true } },
        },
      });
      return row
        ? {
            label: (tr ? row.titleTr : row.titleEn) || row.titleTr,
            publicPath: `/blog/${row.slug}`,
            tagIds: tagIds(row.tags),
          }
        : null;
    }
    case "EXPERIENCE": {
      const row = await prisma.experience.findUnique({
        where: { id: entityKey },
        select: {
          id: true,
          company: true,
          positionTr: true,
          positionEn: true,
          tags: { select: { tagId: true, hidden: true } },
        },
      });
      return row
        ? {
            label: `${row.company} · ${tr ? row.positionTr : row.positionEn}`,
            publicPath: `/experience/${row.id}`,
            tagIds: tagIds(row.tags),
          }
        : null;
    }
    case "SKILL": {
      const row = await prisma.tag.findUnique({
        where: { id: entityKey },
        select: { slug: true, name: true, nameTr: true, nameEn: true },
      });
      return row
        ? {
            label: (tr ? row.nameTr : row.nameEn) || row.name,
            publicPath: `/skills/${row.slug}`,
            tagIds: [],
          }
        : null;
    }
  }
}

/** Range bounds as timestamps: [from 00:00, to + 1 day 00:00) UTC. */
function window(from: string, to: string) {
  return { gte: fromDay(from), lt: fromDay(addDays(to, 1)) };
}

/** One entity's analysis. HOME and PAGE are keyed by path. Admin only; null if missing. */
export async function getEntityAnalytics(
  entityType: AnalyticsEntityType,
  entityKey: string,
  range: RangeWithPrevious,
  locale: Locale,
): Promise<EntityAnalytics | null> {
  await requireAdmin();
  if (entityType === "PAGE" && entityKey === "/") entityType = "HOME";
  const meta = await entityMeta(entityType, entityKey, locale);
  if (!meta) return null;
  const scope = { entityType, entityKey };
  const [current, previous] = await Promise.all([
    cachedRows(range.from, range.to, entityType, entityKey),
    cachedRows(range.previous.from, range.previous.to, entityType, entityKey),
  ]);

  const now = totals(current, scope);
  const before = totals(previous, scope);
  const engagedNow = engagement(current, scope);
  const engagedBefore = engagement(previous, scope);
  const from = breakdown(current, "from", scope);

  // Skill pages the visitors came from: /skills/<slug> → tag.
  const skillFrom = from.filter((item) => item.value.startsWith("/skills/"));
  const slugs = skillFrom.map((item) => item.value.slice("/skills/".length));
  const [skillTags, contentTags] = await Promise.all([
    prisma.tag.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, name: true, nameTr: true, nameEn: true },
    }),
    prisma.tag.findMany({
      where: { id: { in: meta.tagIds }, hidden: false },
      select: { id: true, name: true, nameTr: true, nameEn: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const tagLabel = (tag: { name: string; nameTr: string | null; nameEn: string | null }) =>
    (locale === "tr" ? tag.nameTr : tag.nameEn) || tag.name;
  const bySlug = new Map(skillTags.map((tag) => [tag.slug, tagLabel(tag)]));

  let interactions: EntityAnalytics["interactions"] = null;
  if (entityType === "BLOG") {
    const count = (model: "like" | "comment", from: string, to: string) =>
      model === "like"
        ? prisma.like.count({ where: { postId: entityKey, createdAt: window(from, to) } })
        : prisma.comment.count({ where: { postId: entityKey, createdAt: window(from, to) } });
    const [likes, likesBefore, comments, commentsBefore, totalLikes, totalComments] =
      await Promise.all([
        count("like", range.from, range.to),
        count("like", range.previous.from, range.previous.to),
        count("comment", range.from, range.to),
        count("comment", range.previous.from, range.previous.to),
        prisma.like.count({ where: { postId: entityKey } }),
        prisma.comment.count({ where: { postId: entityKey } }),
      ]);
    interactions = {
      likes: metric(likes, likesBefore),
      comments: metric(comments, commentsBefore),
      totalLikes,
      totalComments,
    };
  }

  return {
    entityType,
    entityKey,
    label: meta.label,
    publicPath: meta.publicPath,
    views: metric(now.views, before.views),
    visitors: metric(now.visitors, before.visitors),
    avgEngagedSeconds: metric(engagedNow.avgSeconds, engagedBefore.avgSeconds),
    avgScroll: metric(engagedNow.avgScroll, engagedBefore.avgScroll),
    series: series(current, eachDay(range.from, range.to), scope),
    previousSeries: series(previous, eachDay(range.previous.from, range.previous.to), scope),
    breakdowns: breakdowns(current, scope, 50),
    from,
    fromSkills: skillFrom.map((item) => ({
      ...item,
      label: bySlug.get(item.value.slice("/skills/".length)) ?? item.value,
    })),
    skills: contentTags.map((tag) => ({
      id: tag.id,
      label: tagLabel(tag),
      href: analyticsHref("SKILL", tag.id),
    })),
    interactions,
  };
}
