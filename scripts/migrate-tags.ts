/**
 * Moves the legacy tags to the canonical tag system (Phase 4, task 2.3). See lib/tags/migrate.ts.
 *
 *   Dry run (default): runs every step in a transaction, prints the report and rolls back.
 *   Apply:             --apply commits the same steps.
 *
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/migrate-tags.ts --dry-run)
 *
 * Connects with DIRECT_URL when set (as migrations do), else DATABASE_URL. Prints tag slugs and
 * names only, never connection details. Safe to run again: a second run reports no changes.
 * Pages cache tag data, so run --apply before the deploy that should show it (or redeploy).
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { migrateTags, type MigrationReport } from "@/lib/tags/migrate";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
if (apply && args.has("--dry-run")) {
  console.error("Pass either --dry-run or --apply.");
  process.exit(2);
}

class DryRunRollback extends Error {}

function print(report: MigrationReport): void {
  const section = (title: string, lines: string[]) => {
    console.log(`\n${title} (${lines.length})`);
    for (const line of lines) console.log(`  ${line}`);
  };
  section(
    "Merged",
    report.merged.map((m) => `${m.from} -> ${m.into}`),
  );
  section(
    "Renamed slug",
    report.renamed.map((r) => `${r.from} -> ${r.to}`),
  );
  section(
    "Taxonomy applied",
    report.curated.map((c) => `${c.slug}: "${c.name}"${c.parent ? ` under ${c.parent}` : ""}`),
  );
  section("Copied translations cleared", report.clearedTranslations);
  section("Created from SiteSettings.skills", report.createdFromSettings);
  section("Created as parent", report.createdAncestors);
}

async function printTree(tx: Prisma.TransactionClient) {
  const tags = await tx.tag.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      isSkill: true,
      _count: { select: { projectTags: true, experienceTags: true, blogPostTags: true } },
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });
  console.log(
    `\nTree after migration (${tags.length} tags; p/e/b = project/experience/post links)`,
  );
  const walk = (parentId: string | null, depth: number) => {
    for (const tag of tags.filter((t) => t.parentId === parentId)) {
      const c = tag._count;
      const flags = tag.isSkill ? "" : " [not a skill]";
      console.log(
        `${"  ".repeat(depth + 1)}${tag.name} (${tag.slug}) ${c.projectTags}/${c.experienceTags}/${c.blogPostTags}${flags}`,
      );
      walk(tag.id, depth + 1);
    }
  };
  walk(null, 0);
}

// One connection for one long transaction. Not createPrismaClient(): its transaction-pooler
// check guards deployed functions, while DIRECT_URL (session pooler or direct) suits a script.
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  max: 1,
  allowExitOnIdle: true,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  console.log(apply ? "APPLY: changes will be committed." : "DRY RUN: changes are rolled back.");
  try {
    await prisma.$transaction(
      async (tx) => {
        const report = await migrateTags(tx);
        print(report);
        await printTree(tx);
        if (!apply) throw new DryRunRollback();
      },
      { timeout: 300_000, maxWait: 30_000 },
    );
    console.log("\nCommitted.");
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
    console.log("\nRolled back (dry run). Run again with --apply to commit.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
