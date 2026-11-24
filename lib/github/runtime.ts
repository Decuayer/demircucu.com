import "server-only";
import { revalidateTag } from "next/cache";
import type { SyncTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/supabase/storage";
import { authFromEnv, githubOwner } from "./auth";
import { GithubClient } from "./client";
import { startRun, syncAll, syncOne, type StartResult, type SyncDeps } from "./sync";

/**
 * App wiring of the sync: Prisma, the media bucket, GitHub credentials from the environment and
 * Next.js cache expiry. One auth object per server instance keeps the installation token cached.
 */
let auth: ReturnType<typeof authFromEnv> | undefined;

function deps(): SyncDeps {
  auth ??= authFromEnv();
  if (auth.mode === "anonymous") {
    console.warn(
      "[github-sync] no GitHub credentials; anonymous requests are limited to 60 per hour",
    );
  }
  return {
    db: prisma,
    client: new GithubClient({ auth }),
    store: { put: putObject },
    owner: githubOwner(),
    revalidate: (tags) => {
      // Route handlers and after(): no read-your-own-writes needed, the next visit re-renders.
      for (const tag of tags) revalidateTag(tag, { expire: 0 });
    },
  };
}

export type SyncRequest =
  | { scope: "all"; force?: boolean }
  | { scope: "repo"; fullName: string; repoId?: number; force?: boolean };

/** Opens a run record; the caller then calls `runSync` (directly or inside `after`). */
export async function openRun(trigger: SyncTrigger, request: SyncRequest): Promise<StartResult> {
  return startRun(prisma, trigger, request.scope === "all" ? null : request.fullName);
}

export async function runSync(runId: string, request: SyncRequest) {
  const d = deps();
  try {
    return request.scope === "all"
      ? await syncAll(d, runId, { force: request.force })
      : await syncOne(d, runId, request.fullName, { force: request.force, repoId: request.repoId });
  } catch (error) {
    console.error("[github-sync] run failed:", (error as Error).message);
    return null;
  }
}
