import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Existing environment variables always win; files only fill in what is missing.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrate, introspection) needs a direct or session-mode connection.
    // The application runtime uses DATABASE_URL (transaction pooler) via lib/prisma.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
