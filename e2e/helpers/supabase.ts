import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E tests that need Supabase Auth run against the local stack (`npm run supabase:start`).
 * Values come from the environment (CI) or `supabase status`. Only local hosts are accepted.
 */
const LOCAL = new Set(["localhost", "127.0.0.1", "::1"]);

function status(): Record<string, string> {
  if (process.env.SUPABASE_TEST_API_URL) return {};
  const out = execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  return JSON.parse(out.slice(out.indexOf("{"))) as Record<string, string>;
}

const s = status();
export const supabaseEnv = {
  apiUrl: process.env.SUPABASE_TEST_API_URL ?? s.API_URL ?? "",
  secretKey: process.env.SUPABASE_TEST_SECRET_KEY ?? s.SECRET_KEY ?? "",
  dbUrl: process.env.E2E_DATABASE_URL ?? s.DB_URL ?? "",
  mailpitUrl: process.env.SUPABASE_TEST_MAILPIT_URL ?? s.MAILPIT_URL ?? "http://127.0.0.1:54324",
};

for (const [name, value] of Object.entries(supabaseEnv)) {
  if (name === "secretKey") continue;
  let host = "";
  try {
    host = new URL(value).hostname;
  } catch {
    throw new Error(`${name} is missing; start the local stack with npm run supabase:start`);
  }
  if (!LOCAL.has(host)) throw new Error(`${name} must point at the local Supabase stack`);
}

export const ADMIN = { email: "e2e-admin@example.test", password: "E2e-Admin-Pass-1" };

export function adminClient() {
  return createClient(supabaseEnv.apiUrl, supabaseEnv.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const client = new Client({ connectionString: supabaseEnv.dbUrl });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Every E2E run shares one client IP; reset the app's limiter between scenarios. */
export async function clearRateLimits(): Promise<void> {
  await sql(`DELETE FROM public."RateLimitBucket"`);
}

/** Waits for the newest e-mail to `to` and returns the first link that contains `marker`. */
export async function linkFromMail(to: string, marker: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${supabaseEnv.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    ).then((r) => r.json() as Promise<{ messages: { ID: string }[] }>);
    const latest = search.messages?.[0];
    if (latest) {
      const message = await fetch(`${supabaseEnv.mailpitUrl}/api/v1/message/${latest.ID}`).then(
        (r) => r.json() as Promise<{ HTML: string }>,
      );
      const href = [...message.HTML.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1]!.replaceAll("&amp;", "&"))
        .find((h) => h.includes(marker));
      if (href) return href;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No e-mail with "${marker}" for ${to}`);
}

export async function deleteMail(): Promise<void> {
  await fetch(`${supabaseEnv.mailpitUrl}/api/v1/messages`, { method: "DELETE" });
}
