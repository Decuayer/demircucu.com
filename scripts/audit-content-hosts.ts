/**
 * Read-only audit of the hosts content references, grouped by how a browser loads them (CSP S10).
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/audit-content-hosts.ts)
 */
import { Client } from "pg";

const SKIP = new Set(["ContactMessage", "Comment", "RateLimitBucket", "_prisma_migrations"]);
const IMAGE_COLS = /^(avatar|logo|images|coverImage|aboutPhoto|faviconUrl|url)$/;
const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;

const label = (u: URL) => {
  if (u.host === own)
    return `OWN-SUPABASE${u.pathname.startsWith("/storage/v1/object/public/") ? "" : " (non-public path)"}`;
  if (u.host.endsWith(".supabase.co")) return "OTHER-SUPABASE-PROJECT";
  return `${u.protocol}//${u.host}`;
};

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL });
  await c.connect();
  await c.query("BEGIN READ ONLY");
  const cols = (
    await c.query(`SELECT table_name t, column_name col, data_type d FROM information_schema.columns
    WHERE table_schema='public' AND (data_type IN ('text','character varying') OR udt_name='_text')`)
  ).rows;
  const stats = new Map<string, Map<string, number>>();
  const add = (host: string, ctx: string) => {
    const m = stats.get(host) ?? new Map();
    m.set(ctx, (m.get(ctx) ?? 0) + 1);
    stats.set(host, m);
  };
  const rowsPerTable = new Map<string, number>();
  for (const { t, col } of cols) {
    if (SKIP.has(t)) continue;
    const rows = (
      await c.query(`SELECT "${col}"::text AS v FROM public."${t}" WHERE "${col}" IS NOT NULL`)
    ).rows;
    rowsPerTable.set(t, Math.max(rowsPerTable.get(t) ?? 0, rows.length));
    for (const { v } of rows as { v: string }[]) {
      const seen: [string, string][] = [];
      const tag = (re: RegExp, ctx: string) => {
        for (const m of v.matchAll(re)) seen.push([m[1]!, ctx]);
      };
      tag(/<img[^>]*\ssrc=["']([^"']+)/gi, "html <img>");
      tag(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g, "markdown image");
      tag(/<(?:iframe|embed)[^>]*\ssrc=["']([^"']+)/gi, "iframe/embed");
      tag(/<(?:video|audio|source)[^>]*\ssrc=["']([^"']+)/gi, "video/audio");
      tag(/<link[^>]*\shref=["']([^"']+)|<script[^>]*\ssrc=["']([^"']+)/gi, "script/link tag");
      const loaded = new Set(seen.map(([u]) => u));
      for (const m of v.matchAll(/(?:https?:)?\/\/[^\s"'<>()\]]+/g)) {
        if (loaded.has(m[0])) continue;
        seen.push([m[0], IMAGE_COLS.test(col) ? `image column ${t}.${col}` : "plain link/text"]);
      }
      for (const [raw, ctx] of seen) {
        try {
          add(label(new URL(raw.startsWith("//") ? `https:${raw}` : raw)), ctx);
        } catch {
          if (!raw.startsWith("/") && !raw.startsWith("data:")) add("UNPARSEABLE", ctx);
        }
      }
    }
  }
  await c.query("ROLLBACK");
  await c.end();
  console.log("rows scanned per table:", Object.fromEntries(rowsPerTable));
  for (const [host, m] of [...stats].sort()) console.log(host, Object.fromEntries(m));
}
main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
