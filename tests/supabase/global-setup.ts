import { execFileSync } from "node:child_process";
import { localSupabase } from "./env";

/** Applies the Prisma migrations to the local Supabase database once per run. */
export default function setup(): void {
  const { dbUrl } = localSupabase();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl },
  });
}
