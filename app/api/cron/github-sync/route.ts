import { timingSafeEqual } from "node:crypto";
import { openRun, runSync } from "@/lib/github/runtime";

/** Vercel Cron (Hobby: once a day, vercel.json). Safety net behind the webhook. */
export const maxDuration = 300;

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("cron not configured", { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return new Response("unauthorized", { status: 401 });
  }
  const run = await openRun("CRON", { scope: "all" });
  if (!run.started) return Response.json({ ok: true, skipped: run.reason });
  const stats = await runSync(run.runId, { scope: "all" });
  return Response.json({ ok: stats !== null, runId: run.runId });
}
