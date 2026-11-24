/**
 * Sets the role of a staging account (never production).
 *
 *   DB_TARGET=staging npx tsx scripts/staging-set-role.ts --email you@example.com --role ADMIN
 *
 * The account must already exist (register on a Preview deployment and confirm the e-mail).
 * With --create a confirmed account is created first via the Auth admin API, using the password
 * in STAGING_ACCOUNT_PASSWORD (used for the automation admin of the Preview E2E run).
 * Values are read from .env.staging.local; only variable names are ever printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parse } from "dotenv";
import { Client } from "pg";
import { extractSupabaseRef, isProductionRef } from "../lib/env/supabase-ref";
import { checkStagingTarget } from "./lib/staging-target";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const file = existsSync(".env.staging.local") ? parse(readFileSync(".env.staging.local")) : {};
  const env = { ...file, DB_TARGET: process.env.DB_TARGET };
  const expectedRef = extractSupabaseRef(file.NEXT_PUBLIC_SUPABASE_URL);
  const problems = checkStagingTarget(env, expectedRef);
  if (isProductionRef(extractSupabaseRef(file.NEXT_PUBLIC_SUPABASE_URL))) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL points at production");
  }
  if (problems.length) throw new Error(`Refusing to touch staging:\n- ${problems.join("\n- ")}`);

  const email = arg("email")?.trim().toLowerCase();
  const role = arg("role") ?? "ADMIN";
  if (!email) throw new Error("--email is required");
  if (role !== "ADMIN" && role !== "USER") throw new Error("--role must be ADMIN or USER");

  if (process.argv.includes("--create")) {
    const password = process.env.STAGING_ACCOUNT_PASSWORD ?? file.STAGING_ACCOUNT_PASSWORD;
    if (!password) throw new Error("STAGING_ACCOUNT_PASSWORD is required with --create");
    const auth = createClient(file.NEXT_PUBLIC_SUPABASE_URL!, file.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).auth.admin;
    const { error } = await auth.createUser({ email, password, email_confirm: true });
    if (error && !/already/i.test(error.message))
      throw new Error(`create failed: ${error.message}`);
    console.log(error ? "account already exists" : "account created (confirmed)");
  }

  const db = new Client({ connectionString: file.DIRECT_URL });
  await db.connect();
  try {
    // The auth.users trigger creates the Profile; only the role changes here.
    const { rowCount } = await db.query(
      `UPDATE public."Profile" SET role = $1::"Role" WHERE lower(email) = $2`,
      [role, email],
    );
    if (rowCount !== 1) throw new Error(`expected one profile for that e-mail, found ${rowCount}`);
    console.log(`role set to ${role}`);
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
