import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { createPoolConfig, isBuildPhase } from "@/lib/db/pool-config";
import { withBuildReadOnlyGuard } from "@/lib/db/build-guard";

export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  const pool = new Pool(createPoolConfig(connectionString));
  pool.on("error", (error) => {
    // An idle client lost its connection (e.g. pooler restart); pg removes it from the pool.
    console.error("Postgres pool error:", error.message);
  });
  // On Vercel Fluid compute, keeps the instance alive until idle connections are closed.
  // No-op outside Vercel and during builds.
  attachDatabasePool(pool);
  const client = new PrismaClient({ adapter: new PrismaPg(pool) });
  // `next build` may read content for prerendering but must never write.
  return isBuildPhase() ? withBuildReadOnlyGuard(client) : client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cached on globalThis in every environment: Next.js can evaluate this module more than once per
// process (server and SSR layers, dev HMR), and each evaluation would otherwise open its own pool.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
