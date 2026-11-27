import { after, type NextRequest } from "next/server";
import { hasSupabaseAuthCookie } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/http/same-origin";
import { clientIp, consume, RATE_LIMITS } from "@/lib/rate-limit";
import { MAX_BODY_BYTES, trackPayload } from "@/lib/analytics/payload";
import { hasPrivacySignal, isBotUserAgent, isPrefetch } from "@/lib/analytics/request";
import {
  recordEngagement,
  recordOutbound,
  recordView,
  type RequestContext,
} from "@/lib/analytics/record";

const noContent = () => new Response(null, { status: 204 });

/** Same-origin check that also accepts beacons from browsers that omit `Origin`. */
function fromOwnSite(headers: Headers): boolean {
  if (headers.get("origin")) return isSameOrigin(headers);
  return headers.get("sec-fetch-site") === "same-origin";
}

/**
 * POST /api/e (formerly /api/track, which re-exports this until 2026-12-27).
 * Page view, engagement and outbound click beacons from `<Analytics />`. Cookieless: visitors are
 * a daily-salted hash. Ignored without a response difference (204): Do Not Track / Global
 * Privacy Control, bots, prefetches, admins, rate-limited clients. The write happens after the
 * response (`after`).
 */
export async function POST(request: NextRequest): Promise<Response> {
  const headers = request.headers;
  if (!fromOwnSite(headers)) return new Response(null, { status: 403 });

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = trackPayload.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const userAgent = headers.get("user-agent");
  if (hasPrivacySignal(headers) || isPrefetch(headers) || isBotUserAgent(userAgent)) {
    return noContent();
  }
  // Only signed-in visitors carry the auth cookie, so anonymous beacons skip the Auth call.
  if (hasSupabaseAuthCookie(request.cookies.getAll().map((cookie) => cookie.name))) {
    const user = await getCurrentUser().catch(() => null);
    if (user?.role === "ADMIN") return noContent();
  }

  const context: RequestContext = {
    headers,
    ip: await clientIp(),
    userAgent: userAgent!,
    host: headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host") || "",
    now: new Date(),
  };
  const payload = parsed.data;
  after(async () => {
    try {
      const limit = await consume(RATE_LIMITS.trackPerIp, context.ip);
      if (!limit.allowed) return;
      if (payload.type === "view") await recordView(payload, context);
      else if (payload.type === "engagement") await recordEngagement(payload, context);
      else await recordOutbound(payload, context);
    } catch (error) {
      console.error("[analytics] track failed:", (error as Error).message);
    }
  });
  return noContent();
}
