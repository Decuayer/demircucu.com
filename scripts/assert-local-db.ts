/**
 * Guard for destructive database scripts (migrate dev, reset, seed).
 * Exits non-zero unless the database Prisma CLI would use is a local instance.
 * Production migrations run only through the protected CI workflow (`prisma migrate deploy`).
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);
const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!raw) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const host = new URL(raw).hostname.replace(/^\[|\]$/g, "");
if (!LOCAL_HOSTS.has(host)) {
  console.error(
    `Refusing to run: database host "${host}" is not local. ` +
      "Point DATABASE_URL/DIRECT_URL at the docker compose database (see .env.example).",
  );
  process.exit(1);
}
