/**
 * Resolves the database URL used by integration tests and refuses to run
 * against anything that is not a local database. This is a hard guard so a
 * misconfigured environment can never point the test suite at production.
 */
export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:54329/demircucu_test";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run integration tests against non-local database host "${host}". ` +
        "Set TEST_DATABASE_URL to a local PostgreSQL instance.",
    );
  }
  return url;
}
