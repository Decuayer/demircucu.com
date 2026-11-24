/**
 * Links existing projects to their GitHub repositories (Phase 5, task 1.2). See lib/github/link.ts.
 *
 *   Dry run (default): prints the plan and changes nothing.
 *   Apply:             --apply sets githubRepoId / githubFullName / source=GITHUB (and githubUrl
 *                      to the repository URL) for the url and name matches, in one transaction.
 *
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/link-existing-projects.ts)
 *
 * Reads the owner's public repositories from the GitHub API (GitHub App or GITHUB_TOKEN when set,
 * anonymous otherwise: one request). Prints slugs, titles and repository names only. Titles,
 * summaries, descriptions and the published flag are not touched: they become the overrides of
 * the synced project. Run it before the first sync; the sync would also link by githubUrl, but
 * not by name.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { authFromEnv, githubOwner } from "@/lib/github/auth";
import { GithubClient } from "@/lib/github/client";
import { planLinks, type LinkMatch } from "@/lib/github/link";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
if (apply && args.has("--dry-run")) {
  console.error("Pass either --dry-run or --apply.");
  process.exit(2);
}

// One connection; not createPrismaClient() (its transaction-pooler check rejects DIRECT_URL).
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  max: 1,
  allowExitOnIdle: true,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const title = (m: LinkMatch) => m.project.titleTr || m.project.titleEn || "(untitled)";

function describe(m: LinkMatch): string {
  const head = `${m.project.slug} "${title(m)}"`;
  switch (m.kind) {
    case "linked":
      return `${head} -> already linked${m.repo ? ` (${m.repo.full_name})` : " (repository not listed)"}`;
    case "url":
    case "name":
      return `${head} -> ${m.repo.full_name} [by ${m.kind}]${m.urlChanges ? " (githubUrl will be set to the repository URL)" : ""}`;
    case "conflict":
      return `${head} -> ${m.repo.full_name} CONFLICT with ${m.others.join(", ")} (not linked)`;
    case "none":
      return `${head} -> no match (${m.reason})`;
  }
}

async function main(): Promise<void> {
  const owner = githubOwner();
  const auth = authFromEnv();
  const client = new GithubClient({ auth });
  console.log(apply ? "APPLY: matches will be written." : "DRY RUN: nothing is written.");
  console.log(`owner ${owner}, credentials: ${auth.mode}`);

  const repos = (await client.listOwnerRepos(owner)).filter((r) => !r.private);
  const projects = await prisma.project.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      titleTr: true,
      titleEn: true,
      githubUrl: true,
      githubRepoId: true,
    },
  });
  const plan = planLinks(projects, repos, owner);

  const groups: [string, LinkMatch["kind"][]][] = [
    ["Will be linked", ["url", "name"]],
    ["Conflicts (decide by hand)", ["conflict"]],
    ["Already linked", ["linked"]],
    ["No repository", ["none"]],
  ];
  for (const [label, kinds] of groups) {
    const lines = plan.matches.filter((m) => kinds.includes(m.kind)).map(describe);
    console.log(`\n${label} (${lines.length})`);
    for (const line of lines) console.log(`  ${line}`);
  }
  console.log(
    `\nRepositories without a project; the first sync imports them as drafts (${plan.unclaimed.length})`,
  );
  for (const repo of plan.unclaimed) console.log(`  ${repo.full_name}`);

  const toLink = plan.matches.filter(
    (m): m is Extract<LinkMatch, { kind: "url" | "name" }> => m.kind === "url" || m.kind === "name",
  );
  if (!apply) {
    console.log(`\n${toLink.length} projects would be linked. Run again with --apply to write.`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    for (const match of toLink) {
      await tx.project.update({
        where: { id: match.project.id },
        data: {
          source: "GITHUB",
          githubRepoId: BigInt(match.repo.id),
          githubFullName: match.repo.full_name,
          githubUrl: match.repo.html_url,
          syncStatus: "PENDING",
        },
      });
    }
  });
  console.log(
    `\nLinked ${toLink.length} projects. Run the sync next (admin > Projects > Sync now).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
