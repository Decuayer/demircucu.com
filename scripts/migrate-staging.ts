/**
 * Applies Prisma migrations (and optionally the seed) to the staging database.
 *
 *   DB_TARGET=staging npm run db:migrate:staging            # locally, reads .env.staging.local
 *   DB_TARGET=staging npm run db:migrate:staging -- --seed  # also run the idempotent seed
 *
 * In CI the variables come from secrets (DATABASE_URL, DIRECT_URL, STAGING_SUPABASE_REF).
 * The environment is built explicitly, so values from .env.local can never leak in.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";
import { extractSupabaseRef } from "../lib/env/supabase-ref";
import { checkStagingTarget } from "./lib/staging-target";

const fromFile = existsSync(".env.staging.local") ? parse(readFileSync(".env.staging.local")) : {};
const target = {
  DB_TARGET: process.env.DB_TARGET,
  DATABASE_URL: process.env.CI ? process.env.DATABASE_URL : fromFile.DATABASE_URL,
  DIRECT_URL: process.env.CI ? process.env.DIRECT_URL : fromFile.DIRECT_URL,
};
const expectedRef =
  process.env.STAGING_SUPABASE_REF ?? extractSupabaseRef(fromFile.NEXT_PUBLIC_SUPABASE_URL);

const problems = checkStagingTarget(target, expectedRef);
if (problems.length > 0) {
  console.error(`Refusing to touch the staging database:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

// Prisma CLI uses DIRECT_URL (session/direct connection) for migrations.
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  DATABASE_URL: target.DIRECT_URL,
  DIRECT_URL: target.DIRECT_URL,
};
execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
if (process.argv.includes("--seed")) {
  execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env });
}
execFileSync("npx", ["prisma", "migrate", "status"], { stdio: "inherit", env });
