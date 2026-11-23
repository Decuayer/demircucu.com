import { afterAll } from "vitest";
import { resolveTestDatabaseUrl } from "./test-db";

// Must run before any module imports `@/lib/prisma`, which reads DATABASE_URL on creation.
process.env.DATABASE_URL = resolveTestDatabaseUrl();

afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
});
