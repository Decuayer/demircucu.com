/**
 * Prepares the local Supabase database for E2E: applies migrations and the seed. Refuses any
 * non-local target (same guard as the integration tests).
 */
import { execFileSync } from "node:child_process";
import { resolveTestDatabaseUrl } from "../tests/setup/test-db";

const url = resolveTestDatabaseUrl({
  TEST_DATABASE_URL:
    process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
});
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env });
