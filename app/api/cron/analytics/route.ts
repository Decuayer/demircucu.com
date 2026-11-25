import { revalidateTag } from "next/cache";
import { cronGate } from "@/lib/http/cron-auth";
import { CacheTags } from "@/lib/cache/tags";
import { runDailyAggregation } from "@/lib/analytics/job";

/** Vercel Cron, 00:15 UTC (vercel.json): aggregates yesterday and applies retention. */
export const maxDuration = 120;

export async function GET(request: Request): Promise<Response> {
  const denied = cronGate(request);
  if (denied) return denied;
  const result = await runDailyAggregation(new Date());
  // Blog view counts are shown on cached public pages.
  if (result.updatedPosts > 0) revalidateTag(CacheTags.posts, { expire: 0 });
  return Response.json({ ok: true, ...result });
}
