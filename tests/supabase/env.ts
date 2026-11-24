import { execFileSync } from "node:child_process";

/**
 * Connection details of the local Supabase stack (`npm run supabase:start`). Read from
 * `supabase status` unless provided through the environment; refuses anything non-local.
 */
export interface LocalSupabase {
  dbUrl: string;
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function assertLocal(url: string, name: string): string {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTS.has(host)) throw new Error(`${name} must point at the local Supabase stack`);
  return url;
}

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  let status: Record<string, string> = {};
  if (!process.env.SUPABASE_TEST_API_URL) {
    const out = execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
    status = JSON.parse(out.slice(out.indexOf("{"))) as Record<string, string>;
  }
  cached = {
    dbUrl: assertLocal(process.env.SUPABASE_TEST_DB_URL ?? status.DB_URL ?? "", "DB_URL"),
    apiUrl: assertLocal(process.env.SUPABASE_TEST_API_URL ?? status.API_URL ?? "", "API_URL"),
    publishableKey: process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? status.PUBLISHABLE_KEY ?? "",
    secretKey: process.env.SUPABASE_TEST_SECRET_KEY ?? status.SECRET_KEY ?? "",
  };
  return cached;
}
