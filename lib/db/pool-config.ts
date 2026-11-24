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

/** `next build` sets NEXT_PHASE to this value while it prerenders pages. */
export const BUILD_PHASE = "phase-production-build";

/** Supabase transaction pooler port. The session pooler (5432) caused EMAXCONNSESSION. */
export const SUPABASE_TRANSACTION_POOLER_PORT = "6543";

export function isBuildPhase(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PHASE === BUILD_PHASE;
}

/**
 * Throws when the runtime connection goes through a Supabase pooler on any port other than the
 * transaction pooler. Direct connections (`db.<ref>.supabase.co`) and local databases are left
 * alone; they are used by migrations and tests, never by deployed functions.
 */
export function assertTransactionPooler(connectionString: string | undefined): void {
  if (!connectionString) return;
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    // Not a URL (e.g. key=value DSN). pg reports the real problem on connect.
    return;
  }
  if (!url.hostname.endsWith(".pooler.supabase.com")) return;
  const port = url.port || "5432";
  if (port !== SUPABASE_TRANSACTION_POOLER_PORT) {
    // Never include the URL itself: it carries credentials.
    throw new Error(
      `DATABASE_URL must use the Supabase transaction pooler (port ${SUPABASE_TRANSACTION_POOLER_PORT}); ` +
        `the session pooler (port ${port}) exhausts backend connections.`,
    );
  }
}

export function createPoolConfig(
  connectionString: string | undefined,
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  assertTransactionPooler(connectionString);
  const parsedMax = Number.parseInt(env.DATABASE_POOL_MAX ?? "", 10);
  const configuredMax = Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : DEFAULT_POOL_MAX;
  return {
    connectionString,
    // Build workers prerender pages in parallel; one connection each keeps the total at
    // `workers x 1` no matter how many pages a worker renders.
    max: isBuildPhase(env) ? 1 : configuredMax,
    // Close idle connections quickly so suspended or recycled instances do not hold them.
    idleTimeoutMillis: 5_000,
    // Fail fast instead of queueing requests behind an exhausted pooler.
    connectionTimeoutMillis: 10_000,
    // Let build workers and scripts exit without an explicit pool.end().
    allowExitOnIdle: true,
  };
}
