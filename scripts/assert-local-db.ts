/**
 * Guard for destructive database scripts (migrate dev, reset, seed).
 * Exits non-zero unless every database variable that is set points at a local instance.
 * Production migrations run only through the protected CI workflow (`prisma migrate deploy`).
 * Never prints connection strings or host names.
 */
import * as dotenv from "dotenv";
import { DATABASE_URL_VARS, findNonLocalDatabaseVars } from "./lib/local-db";

// Same loading order as prisma.config.ts: existing environment wins, files fill gaps.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

if (!DATABASE_URL_VARS.some((name) => process.env[name])) {
  console.error("No database URL is set (DATABASE_URL / DIRECT_URL).");
  process.exit(1);
}

const remote = findNonLocalDatabaseVars(process.env);
if (remote.length > 0) {
  console.error(
    `Refusing to run: ${remote.join(", ")} point(s) at a non-local database. ` +
      "Use the docker compose database (see .env.example).",
  );
  process.exit(1);
}
