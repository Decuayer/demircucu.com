/**
 * Read-only check of the S1/S9 database state on any environment:
 *   (set -a; . ./.env.staging.local; set +a; npx tsx scripts/verify-db-lockdown.ts)
 * Uses DIRECT_URL in a read-only transaction. Prints table names and counts only, never data or
 * connection details. Exits 1 if anything is not locked down.
 */
import { Client } from "pg";

async function main(): Promise<boolean> {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  let failed = false;
  const check = (label: string, ok: boolean, detail: unknown) => {
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(detail)}`);
  };

  try {
    await client.query("BEGIN READ ONLY");
    const q = async <T>(sql: string) => (await client.query(sql)).rows as T[];

    const noRls = await q<{ relname: string }>(`
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity`);
    check(
      "tables without RLS",
      noRls.length === 0,
      noRls.map((r) => r.relname),
    );

    for (const role of ["anon", "authenticated"]) {
      const [row] = await q<{ usage: boolean; tables: number }>(`
      SELECT has_schema_privilege('${role}', 'public', 'USAGE') AS usage,
        (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
           AND (has_table_privilege('${role}', c.oid, 'SELECT')
             OR has_table_privilege('${role}', c.oid, 'INSERT')
             OR has_table_privilege('${role}', c.oid, 'UPDATE')
             OR has_table_privilege('${role}', c.oid, 'DELETE'))) AS tables`);
      check(`${role} access`, !row!.usage && row!.tables === 0, row);
    }

    const triggers = await q<{ tgname: string }>(`
    SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
    ORDER BY 1`);
    const names = triggers.map((t) => t.tgname);
    check(
      "auth.users profile triggers",
      ["on_auth_user_created", "on_auth_user_deleted", "on_auth_user_email_changed"].every((t) =>
        names.includes(t),
      ),
      names,
    );

    const [orphans] = await q<{ n: number }>(`
    SELECT count(*)::int AS n FROM auth.users u
    LEFT JOIN public."Profile" p ON p.id = u.id::text WHERE p.id IS NULL`);
    check("auth users without profile", orphans!.n === 0, orphans!.n);
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
  return !failed;
}

main().then(
  (ok) => process.exit(ok ? 0 : 1),
  (error: unknown) => {
    console.error("verify-db-lockdown failed:", (error as Error).message);
    process.exit(1);
  },
);
