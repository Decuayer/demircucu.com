/**
 * Production build for E2E against the local Supabase stack: Auth, DB (prerendered content) and
 * auth e-mail links all point at local services and http://localhost:3100.
 */
import { execFileSync } from "node:child_process";

const out = execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
const status = JSON.parse(out.slice(out.indexOf("{"))) as Record<string, string>;
const db = process.env.E2E_DATABASE_URL ?? status.DB_URL!;
if (!/^postgresql:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(db)) {
  throw new Error("E2E builds must use the local Supabase database");
}

execFileSync("node", ["scripts/copy-pdfjs-assets.mjs"], { stdio: "inherit" });
execFileSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SECRET_KEY,
    DATABASE_URL: db,
    DIRECT_URL: db,
    NEXT_PUBLIC_APP_URL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  },
});
