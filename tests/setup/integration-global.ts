import { execFileSync } from "node:child_process";
import { resolveTestDatabaseUrl } from "./test-db";

/** Applies all Prisma migrations to the local test database once per run. */
export default function setup(): void {
  const url = resolveTestDatabaseUrl();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    // Both variables are overridden so prisma.config.ts can never fall back to .env.local values.
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
