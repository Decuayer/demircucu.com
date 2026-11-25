import { cronGate } from "@/lib/http/cron-auth";
import { openRun, runSync } from "@/lib/github/runtime";

/** Vercel Cron (Hobby: once a day, vercel.json). Safety net behind the webhook. */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const denied = cronGate(request);
  if (denied) return denied;
  const run = await openRun("CRON", { scope: "all" });
  if (!run.started) return Response.json({ ok: true, skipped: run.reason });
  const stats = await runSync(run.runId, { scope: "all" });
  return Response.json({ ok: stats !== null, runId: run.runId });
}
