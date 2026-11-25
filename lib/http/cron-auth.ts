import { timingSafeEqual } from "node:crypto";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; compared in constant time. */
export function isAuthorizedCron(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** null when the request may run; otherwise the response to return. */
export function cronGate(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("cron not configured", { status: 503 });
  if (!isAuthorizedCron(request.headers.get("authorization"), secret)) {
    return new Response("unauthorized", { status: 401 });
  }
  return null;
}
