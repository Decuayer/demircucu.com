import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { RATE_LIMIT_RETENTION_SECONDS, type RateLimitPolicy } from "./policies";

export { RATE_LIMITS } from "./policies";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function bucketKey(policy: RateLimitPolicy, identifier: string): string {
  const digest = createHash("sha256").update(identifier.toLowerCase()).digest("hex");
  return `${policy.name}:${digest}`;
}

/**
 * Counts one attempt and reports whether it is within the policy. A single atomic statement:
 * concurrent requests cannot both slip through the last free slot.
 *
 * Fails open (allows the request) if the database is unreachable, so an outage of the limiter
 * does not take down sign-in; the error is logged.
 */
export async function consume(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitResult> {
  const key = bucketKey(policy, identifier);
  try {
    const [row] = await prisma.$queryRaw<{ count: number; reset_in: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${policy.windowSeconds})
          THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStart" = CASE
          WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${policy.windowSeconds})
          THEN now() ELSE "RateLimitBucket"."windowStart" END
      RETURNING "count",
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("windowStart" + make_interval(secs => ${policy.windowSeconds}) - now()))))::int AS reset_in
    `;
    if (Math.random() < 0.01) void prune();
    const count = row?.count ?? 1;
    return {
      allowed: count <= policy.limit,
      remaining: Math.max(0, policy.limit - count),
      retryAfter: row?.reset_in ?? policy.windowSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] unavailable, allowing request:", (error as Error).message);
    return { allowed: true, remaining: policy.limit, retryAfter: 0 };
  }
}

/** Consumes every policy; denied if any of them is exhausted. */
export async function consumeAll(
  checks: ReadonlyArray<readonly [RateLimitPolicy, string]>,
): Promise<RateLimitResult> {
  const results = await Promise.all(checks.map(([policy, id]) => consume(policy, id)));
  const denied = results.filter((result) => !result.allowed);
  if (denied.length === 0) {
    return {
      allowed: true,
      remaining: Math.min(...results.map((r) => r.remaining)),
      retryAfter: 0,
    };
  }
  return { allowed: false, remaining: 0, retryAfter: Math.max(...denied.map((r) => r.retryAfter)) };
}

async function prune(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "windowStart" < now() - make_interval(secs => ${RATE_LIMIT_RETENTION_SECONDS})
    `;
  } catch (error) {
    console.error("[rate-limit] prune failed:", (error as Error).message);
  }
}

/**
 * Client IP for rate limiting. On Vercel, `x-forwarded-for` is set by the edge network and its
 * first entry is the client; elsewhere it falls back to `x-real-ip` or a shared bucket.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}
