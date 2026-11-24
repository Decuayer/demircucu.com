import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Every table in `public` must have row level security enabled (security review S1). Runs on
 * plain PostgreSQL in CI; the Supabase-specific grant checks live in tests/supabase.
 * A new migration that creates a table must enable RLS for it, or this test fails.
 */
describe("row level security", () => {
  it("is enabled on every table in public", async () => {
    const tables = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    `;
    expect(tables.length).toBeGreaterThan(10);
    expect(tables.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
  });
});
