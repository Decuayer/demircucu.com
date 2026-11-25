import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type OutboundTarget } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyPath } from "./paths";
import type { EngagementPayload, OutboundPayload, ViewPayload } from "./payload";
import { countryFrom, linkHost, parseUserAgent, referrerHost } from "./request";
import { resolveEntity } from "./resolve";
import { dailySalt, visitorHash } from "./salt";

/** A repeat view of the same page by the same visitor within this window is not counted. */
export const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
/** A visitor's session ends after this much inactivity (same as the dedupe window). */
export const SESSION_GAP_MS = DEDUPE_WINDOW_MS;
/** Engagement and click beacons may refer to page views up to this old. */
export const BEACON_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface RequestContext {
  headers: Headers;
  ip: string;
  userAgent: string;
  /** Host that served the page, to tell internal referrers apart. */
  host: string;
  now: Date;
}

export type RecordOutcome = "recorded" | "untracked" | "unknown" | "duplicate";

async function hashFor(context: RequestContext): Promise<string> {
  return visitorHash(await dailySalt(context.now), context.ip, context.userAgent);
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export async function recordView(
  payload: ViewPayload,
  context: RequestContext,
): Promise<RecordOutcome> {
  const classified = classifyPath(payload.path);
  if (!classified) return "untracked";
  const entity = await resolveEntity(classified.route);
  if (!entity) return "unknown";

  const hash = await hashFor(context);
  const recent = await prisma.pageView.findMany({
    where: {
      visitorHash: hash,
      createdAt: { gte: new Date(context.now.getTime() - DEDUPE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { path: true, sessionId: true },
    take: 50,
  });
  if (recent.some((view) => view.path === classified.path)) return "duplicate";

  const client = parseUserAgent(context.userAgent);
  try {
    await prisma.pageView.create({
      data: {
        id: payload.id,
        createdAt: context.now,
        path: classified.path,
        locale: classified.locale,
        entityType: entity.entityType,
        entityId: entity.entityId,
        referrerHost: referrerHost(payload.referrer, context.host),
        utmSource: clean(payload.utmSource),
        utmMedium: clean(payload.utmMedium),
        utmCampaign: clean(payload.utmCampaign),
        country: countryFrom(context.headers),
        deviceType: client.deviceType,
        browser: client.browser,
        os: client.os,
        visitorHash: hash,
        sessionId: recent[0]?.sessionId ?? randomUUID(),
      },
    });
  } catch (error) {
    // A replayed beacon with the same id.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "duplicate";
    }
    throw error;
  }
  return "recorded";
}

/**
 * Engagement for a page view. The id is a random UUID only the page that created the view
 * knows; values only ever grow (the tracker sends running totals, possibly more than once).
 */
export async function recordEngagement(
  payload: EngagementPayload,
  context: RequestContext,
): Promise<boolean> {
  const since = new Date(context.now.getTime() - BEACON_MAX_AGE_MS);
  const updated = await prisma.$executeRaw`
    UPDATE "PageView"
    SET "durationMs" = GREATEST(COALESCE("durationMs", 0), ${payload.durationMs}),
        "scrollDepth" = GREATEST(COALESCE("scrollDepth", 0), ${payload.scrollDepth})
    WHERE "id" = ${payload.id} AND "createdAt" >= ${since}
  `;
  return updated > 0;
}

export function outboundTarget(host: string, claimed: OutboundTarget | undefined): OutboundTarget {
  const github = host === "github.com" || host.endsWith(".github.com");
  if (claimed === "GITHUB") return github ? "GITHUB" : "OTHER";
  if (claimed) return claimed;
  return github ? "GITHUB" : "OTHER";
}

export async function recordOutbound(
  payload: OutboundPayload,
  context: RequestContext,
): Promise<RecordOutcome> {
  const host = linkHost(payload.href);
  if (!host) return "untracked";
  const classified = classifyPath(payload.path);
  if (!classified) return "untracked";
  const entity = await resolveEntity(classified.route);
  if (!entity) return "unknown";

  const since = new Date(context.now.getTime() - BEACON_MAX_AGE_MS);
  const view = await prisma.pageView.findFirst({
    where: { id: payload.id, createdAt: { gte: since } },
    select: { id: true },
  });
  await prisma.outboundClick.create({
    data: {
      createdAt: context.now,
      pageViewId: view?.id ?? null,
      entityType: entity.entityType,
      entityId: entity.entityId,
      target: outboundTarget(host, payload.target),
      targetHost: host,
      visitorHash: await hashFor(context),
    },
  });
  return "recorded";
}
