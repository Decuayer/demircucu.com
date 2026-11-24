import { after } from "next/server";
import { githubOwner } from "@/lib/github/auth";
import { openRun, runSync, type SyncRequest } from "@/lib/github/runtime";
import { routeWebhook, verifySignature } from "@/lib/github/webhook";

/** The sync runs after the response (GitHub expects an answer within 10 s). */
export const maxDuration = 300;

/** Payloads above this are not ours to process (push events of huge pushes). */
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook not configured", { status: 503 });

  const length = Number(request.headers.get("content-length"));
  if (length > MAX_BODY_BYTES) return new Response("payload too large", { status: 413 });
  const body = await request.text();
  if (!verifySignature(secret, body, request.headers.get("x-hub-signature-256"))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ ok: true, event });

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("invalid JSON", { status: 400 });
  }

  const action = routeWebhook(event, payload, githubOwner());
  if (action.kind === "ignore")
    return Response.json({ ok: true, ignored: action.reason }, { status: 202 });

  const requests: SyncRequest[] =
    action.kind === "all"
      ? [{ scope: "all" }]
      : action.repos.map((r) => ({ scope: "repo", fullName: r.fullName, repoId: r.id }));

  after(async () => {
    for (const syncRequest of requests) {
      const run = await openRun("WEBHOOK", syncRequest);
      if (run.started) await runSync(run.runId, syncRequest);
    }
  });
  return Response.json({ ok: true, queued: requests.length }, { status: 202 });
}
