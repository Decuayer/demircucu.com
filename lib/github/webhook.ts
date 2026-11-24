/**
 * GitHub App webhook (task 1.2, trigger 3): signature check and event routing. Pure, tested.
 *
 * Events that start a single-repository sync:
 *   push                       default branch only
 *   repository                 created, edited, renamed, archived, unarchived, publicized,
 *                              privatized, deleted, transferred
 *   public                     private -> public
 *   installation_repositories  repositories added to the installation (new repositories with
 *                              an "All repositories" installation)
 * `installation` (created) starts a full sync. Everything else is acknowledged and ignored.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(secret: string, body: string, header: string | null): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`,
  );
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export type WebhookAction =
  | { kind: "ignore"; reason: string }
  | { kind: "all" }
  | { kind: "repos"; repos: { fullName: string; id: number }[] };

interface RepoRef {
  id?: unknown;
  full_name?: unknown;
  default_branch?: unknown;
  owner?: { login?: unknown };
}

const REPOSITORY_ACTIONS = new Set([
  "created",
  "edited",
  "renamed",
  "archived",
  "unarchived",
  "publicized",
  "privatized",
  "deleted",
  "transferred",
]);

function ref(repo: RepoRef | undefined): { fullName: string; id: number } | null {
  if (!repo || typeof repo.full_name !== "string" || typeof repo.id !== "number") return null;
  return { fullName: repo.full_name, id: repo.id };
}

const ownedBy = (fullName: string, owner: string) =>
  fullName.split("/")[0]?.toLowerCase() === owner.toLowerCase();

export function routeWebhook(event: string | null, payload: unknown, owner: string): WebhookAction {
  const body = (payload ?? {}) as {
    action?: unknown;
    ref?: unknown;
    repository?: RepoRef;
    repositories_added?: RepoRef[];
  };
  const only = (repo: { fullName: string; id: number } | null): WebhookAction => {
    if (!repo) return { kind: "ignore", reason: "noRepository" };
    if (!ownedBy(repo.fullName, owner)) return { kind: "ignore", reason: "otherOwner" };
    return { kind: "repos", repos: [repo] };
  };

  switch (event) {
    case "push": {
      const branch = body.repository?.default_branch;
      if (typeof branch !== "string" || body.ref !== `refs/heads/${branch}`) {
        return { kind: "ignore", reason: "notDefaultBranch" };
      }
      return only(ref(body.repository));
    }
    case "repository":
      if (typeof body.action !== "string" || !REPOSITORY_ACTIONS.has(body.action)) {
        return { kind: "ignore", reason: "action" };
      }
      return only(ref(body.repository));
    case "public":
      return only(ref(body.repository));
    case "installation_repositories": {
      if (body.action !== "added") return { kind: "ignore", reason: "action" };
      const repos = (body.repositories_added ?? [])
        .map(ref)
        .filter(
          (r): r is { fullName: string; id: number } => r !== null && ownedBy(r.fullName, owner),
        );
      return repos.length ? { kind: "repos", repos } : { kind: "ignore", reason: "noRepository" };
    }
    case "installation":
      return body.action === "created" ? { kind: "all" } : { kind: "ignore", reason: "action" };
    default:
      return { kind: "ignore", reason: "event" };
  }
}
