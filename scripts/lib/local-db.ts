/** Hosts considered local (docker compose, loopback, CI service containers). */
export const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

/** Every variable any tool in this repo may read a database connection from. */
export const DATABASE_URL_VARS = ["DATABASE_URL", "DIRECT_URL", "SHADOW_DATABASE_URL"] as const;

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
    return LOCAL_DB_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Returns the names (never the values) of database variables that are set but not local.
 * All of them must be local: Prisma CLI, seed and runtime pick different variables, so a
 * single remote value is enough to reach a remote database.
 */
export function findNonLocalDatabaseVars(env: Record<string, string | undefined>): string[] {
  return DATABASE_URL_VARS.filter((name) => {
    const value = env[name];
    return value !== undefined && value !== "" && !isLocalDatabaseUrl(value);
  });
}
