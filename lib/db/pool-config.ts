import type { PoolConfig } from "pg";

/**
 * Connection pool settings for serverless.
 *
 * Every function instance (and every `next build` worker) owns one pool, so the number of
 * database connections is roughly `instances x max`. Supabase's pooler has a small shared
 * backend limit, so each instance keeps only a few connections and releases idle ones quickly.
 *
 * Prepared statements: `@prisma/adapter-pg` sends unnamed statements unless a
 * `statementNameGenerator` is configured, which is compatible with Supavisor transaction mode
 * (port 6543). Do not add a `statementNameGenerator` while using the transaction pooler.
 */
export const DEFAULT_POOL_MAX = 3;

export function createPoolConfig(
  connectionString: string | undefined,
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  const parsedMax = Number.parseInt(env.DATABASE_POOL_MAX ?? "", 10);
  return {
    connectionString,
    max: Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : DEFAULT_POOL_MAX,
    // Close idle connections quickly so suspended or recycled instances do not hold them.
    idleTimeoutMillis: 5_000,
    // Fail fast instead of queueing requests behind an exhausted pooler.
    connectionTimeoutMillis: 10_000,
    // Let build workers and scripts exit without an explicit pool.end().
    allowExitOnIdle: true,
  };
}
