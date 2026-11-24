/**
 * Read-only, counts-only audit of media references before the Phase 3 path backfill.
 * Prints numbers and table/column names only; never content, URLs or file names.
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/audit-media-refs.ts)
 */
import { Client } from "pg";

const PUBLIC_PREFIX = "/storage/v1/object/public/media/";

type Kind = "ownBucket" | "ownBucketNoMediaFile" | "external" | "relative" | "unparseable";

async function main() {
  const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
  const c = new Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
  await c.connect();
  await c.query("BEGIN READ ONLY");

  const mediaPaths = new Set(
    (await c.query<{ path: string }>(`SELECT path FROM public."MediaFile"`)).rows.map(
      (r) => r.path,
    ),
  );
  const mediaUrlMismatch = (
    await c.query<{ n: string }>(
      `SELECT count(*) n FROM public."MediaFile" WHERE url NOT LIKE '%' || '${PUBLIC_PREFIX}' || path`,
    )
  ).rows[0]!.n;
  const dupPaths = (
    await c.query<{ n: string }>(
      `SELECT count(*) n FROM (SELECT path FROM public."MediaFile" GROUP BY path HAVING count(*) > 1) d`,
    )
  ).rows[0]!.n;

  const classify = (raw: string): Kind => {
    if (raw.startsWith("/")) return "relative";
    try {
      const u = new URL(raw);
      if (u.host !== own || !u.pathname.startsWith(PUBLIC_PREFIX)) return "external";
      const path = decodeURIComponent(u.pathname.slice(PUBLIC_PREFIX.length));
      return mediaPaths.has(path) ? "ownBucket" : "ownBucketNoMediaFile";
    } catch {
      return "unparseable";
    }
  };

  const report: Record<string, Partial<Record<Kind | "rows" | "emptyArrayRows", number>>> = {};
  const bump = (key: string, kind: Kind | "rows" | "emptyArrayRows") => {
    const r = (report[key] ??= {});
    r[kind] = (r[kind] ?? 0) + 1;
  };

  const scalar: [string, string][] = [
    ["Project", "logo"],
    ["Experience", "logo"],
    ["BlogPost", "coverImage"],
    ["SiteSettings", "aboutPhoto"],
    ["SiteSettings", "faviconUrl"],
    ["Profile", "avatar"],
  ];
  for (const [t, col] of scalar) {
    const rows = (
      await c.query<{ v: string }>(
        `SELECT "${col}" v FROM public."${t}" WHERE "${col}" IS NOT NULL AND "${col}" <> ''`,
      )
    ).rows;
    for (const { v } of rows) bump(`${t}.${col}`, classify(v));
  }

  for (const t of ["Project", "Experience"]) {
    const rows = (await c.query<{ v: string[] }>(`SELECT images v FROM public."${t}"`)).rows;
    for (const { v } of rows) {
      if (!v || v.length === 0) continue;
      bump(`${t}.images`, "rows");
      for (const u of v) bump(`${t}.images`, classify(u));
    }
  }

  for (const t of ["Project", "Experience", "BlogPost"]) {
    const rows = (
      await c.query<{ v: unknown }>(`SELECT files v FROM public."${t}" WHERE files IS NOT NULL`)
    ).rows;
    for (const { v } of rows) {
      if (!Array.isArray(v) || v.length === 0) {
        bump(`${t}.files`, "emptyArrayRows");
        continue;
      }
      bump(`${t}.files`, "rows");
      for (const item of v as { url?: unknown }[]) {
        bump(`${t}.files`, typeof item?.url === "string" ? classify(item.url) : "unparseable");
      }
    }
  }

  const html: [string, string][] = [
    ["Project", "descriptionTr"],
    ["Project", "descriptionEn"],
    ["Experience", "detailsTr"],
    ["Experience", "detailsEn"],
    ["BlogPost", "contentTr"],
    ["BlogPost", "contentEn"],
    ["SiteSettings", "aboutBioTr"],
    ["SiteSettings", "aboutBioEn"],
  ];
  for (const [t, col] of html) {
    const rows = (
      await c.query<{ v: string }>(
        `SELECT "${col}" v FROM public."${t}" WHERE "${col}" IS NOT NULL`,
      )
    ).rows;
    for (const { v } of rows) {
      for (const m of v.matchAll(/<img[^>]*\ssrc=["']([^"']+)/gi))
        bump(`${t}.${col} <img>`, classify(m[1]!));
      for (const m of v.matchAll(/<a[^>]*\shref=["']([^"']+)/gi)) {
        const k = classify(m[1]!);
        if (k === "ownBucket" || k === "ownBucketNoMediaFile") bump(`${t}.${col} <a> to bucket`, k);
      }
    }
  }

  const tags = (
    await c.query<{
      total: string;
      lower_dupes: string;
      slug_dupes_after_norm: string;
      nametr_ne_nameen: string;
    }>(`
      SELECT
        (SELECT count(*) FROM public."Tag") total,
        (SELECT count(*) FROM (SELECT lower("nameEn") FROM public."Tag" GROUP BY 1 HAVING count(*) > 1) d) lower_dupes,
        (SELECT count(*) FROM (SELECT regexp_replace(lower(slug), '[^a-z0-9]+', '-', 'g') FROM public."Tag" GROUP BY 1 HAVING count(*) > 1) d) slug_dupes_after_norm,
        (SELECT count(*) FROM public."Tag" WHERE "nameTr" <> "nameEn") nametr_ne_nameen`)
  ).rows[0];
  const tagLinks: Record<string, string> = {};
  for (const j of ["_ProjectToTag", "_ExperienceToTag", "_BlogPostToTag"]) {
    tagLinks[j] = (await c.query<{ n: string }>(`SELECT count(*) n FROM public."${j}"`)).rows[0]!.n;
  }
  const counts = (
    await c.query(`SELECT
      (SELECT count(*) FROM public."MediaFile") media_files,
      (SELECT count(*) FROM public."MediaFile" WHERE "usedIn" IS NOT NULL) media_with_used_in,
      (SELECT count(*) FROM public."Project") projects,
      (SELECT count(*) FROM public."Experience") experiences,
      (SELECT count(*) FROM public."BlogPost") posts,
      (SELECT count(*) FROM public."Project" WHERE "summaryTr" = '' OR "summaryEn" = '') projects_empty_summary`)
  ).rows[0];

  await c.query("ROLLBACK");
  await c.end();
  console.log(
    JSON.stringify({ counts, mediaUrlMismatch, dupPaths, refs: report, tags, tagLinks }, null, 2),
  );
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
