import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPrismaClient } from "@/lib/prisma";
import { DEFAULT_POOL_MAX } from "@/lib/db/pool-config";
import { resolveTestDatabaseUrl } from "../setup/test-db";

/**
 * Regression test for production incident EMAXCONNSESSION ("max clients reached").
 *
 * The production pooler caps backend connections. Locally the cap is reproduced with a role that
 * has a CONNECTION LIMIT equal to the per-instance pool size; Postgres rejects every connection
 * beyond it, just like the pooler did.
 */
const ROLE = "pool_limit_test";
const CONNECTION_LIMIT = DEFAULT_POOL_MAX;
const CONCURRENT_QUERIES = 30;

const adminUrl = resolveTestDatabaseUrl();
const limitedUrl = (() => {
  const url = new URL(adminUrl);
  url.username = ROLE;
  url.password = ROLE;
  return url.toString();
})();

async function withAdmin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function dropRole(client: Client) {
  const { rowCount } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE]);
  if (!rowCount) return;
  await client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = $1", [
    ROLE,
  ]);
  await client.query(`DROP OWNED BY ${ROLE}`);
  await client.query(`DROP ROLE ${ROLE}`);
}

/** Runs queries concurrently while sampling the role's open connections. */
async function runConcurrently(prisma: PrismaClient) {
  let peak = 0;
  let sampling = true;
  const sampler = withAdmin(async (admin) => {
    while (sampling) {
      const { rows } = await admin.query<{ count: string }>(
        "SELECT count(*) FROM pg_stat_activity WHERE usename = $1",
        [ROLE],
      );
      peak = Math.max(peak, Number(rows[0].count));
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  try {
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_QUERIES }, (_, i) =>
        i % 2 === 0
          ? prisma.siteSettings.findUnique({ where: { id: "main" } })
          : prisma.$queryRaw`SELECT pg_sleep(0.05)::text`,
      ),
    );
    return { results, peak };
  } finally {
    sampling = false;
    await sampler;
  }
}

describe("database connection pool", () => {
  beforeAll(async () => {
    await withAdmin(async (client) => {
      await dropRole(client);
      const db = new URL(adminUrl).pathname.slice(1);
      await client.query(
        `CREATE ROLE ${ROLE} LOGIN PASSWORD '${ROLE}' CONNECTION LIMIT ${CONNECTION_LIMIT}`,
      );
      await client.query(`GRANT CONNECT ON DATABASE "${db}" TO ${ROLE}`);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
      await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ROLE}`);
    });
  });

  afterAll(async () => {
    await withAdmin(dropRole);
  });

  it("reproduces the incident with the previous unbounded pool (pg default max 10)", async () => {
    const pool = new Pool({ connectionString: limitedUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      const { results } = await runConcurrently(prisma);
      const failures = results.filter((r) => r.status === "rejected");
      expect(failures.length).toBeGreaterThan(0);
      for (const failure of failures) {
        expect(String((failure as PromiseRejectedResult).reason)).toMatch(/too many connections/i);
      }
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  });

  it("stays within the connection limit with the serverless pool settings", async () => {
    const prisma = createPrismaClient(limitedUrl);
    try {
      const { results, peak } = await runConcurrently(prisma);
      const failures = results.filter((r) => r.status === "rejected");
      expect(failures).toEqual([]);
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThanOrEqual(CONNECTION_LIMIT);
    } finally {
      await prisma.$disconnect();
    }
  });
});
