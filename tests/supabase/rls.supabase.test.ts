import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { localSupabase } from "./env";

/**
 * Security review S1 against a real Supabase database: the client roles used by the Data API
 * (`anon`, `authenticated`) can reach no table in `public`, and every table has RLS enabled.
 */
const env = localSupabase();
const db = new Client({ connectionString: env.dbUrl });

beforeAll(() => db.connect());
afterAll(() => db.end());

const CLIENT_ROLES = ["anon", "authenticated"] as const;

describe("public schema lockdown", () => {
  it("has RLS enabled on every table", async () => {
    const { rows } = await db.query<{ relname: string }>(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity`);
    expect(rows).toEqual([]);
  });

  it.each(CLIENT_ROLES)("%s has no USAGE on schema public", async (role) => {
    const { rows } = await db.query(`SELECT has_schema_privilege($1, 'public', 'USAGE') AS ok`, [
      role,
    ]);
    expect(rows[0].ok).toBe(false);
  });

  it.each(CLIENT_ROLES)("%s has no privilege on any public table", async (role) => {
    const { rows } = await db.query<{ table: string }>(
      `SELECT c.relname AS table FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
         AND (has_table_privilege($1, c.oid, 'SELECT') OR has_table_privilege($1, c.oid, 'INSERT')
           OR has_table_privilege($1, c.oid, 'UPDATE') OR has_table_privilege($1, c.oid, 'DELETE'))`,
      [role],
    );
    expect(rows).toEqual([]);
  });

  it.each(CLIENT_ROLES)("%s cannot read Profile even when switching role", async (role) => {
    await db.query("BEGIN");
    try {
      await db.query(`SET LOCAL ROLE ${role}`);
      await expect(db.query(`SELECT * FROM public."Profile" LIMIT 1`)).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.query("ROLLBACK");
    }
  });

  it("keeps the trigger functions out of reach of client roles", async () => {
    const { rows } = await db.query(
      `SELECT has_schema_privilege('anon', 'app_private', 'USAGE') AS anon,
              has_schema_privilege('authenticated', 'app_private', 'USAGE') AS authed`,
    );
    expect(rows[0]).toEqual({ anon: false, authed: false });
  });
});

describe("Data API (PostgREST)", () => {
  it.each(["Profile", "ContactMessage", "SiteSettings"])(
    "refuses %s to the publishable key",
    async (table) => {
      const res = await fetch(`${env.apiUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: env.publishableKey },
      });
      expect(res.ok).toBe(false);
    },
  );

  it("refuses to write Profile.role through the API", async () => {
    const res = await fetch(`${env.apiUrl}/rest/v1/Profile?id=neq.x`, {
      method: "PATCH",
      headers: {
        apikey: env.publishableKey,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    expect(res.ok).toBe(false);
  });
});
