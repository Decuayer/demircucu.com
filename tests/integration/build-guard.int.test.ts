import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BuildWriteError, withBuildReadOnlyGuard } from "@/lib/db/build-guard";
import { resolveTestDatabaseUrl } from "../setup/test-db";

/** The client used while `next build` prerenders pages must never write. */
const pool = new Pool({ connectionString: resolveTestDatabaseUrl(), max: 1 });
const guarded = withBuildReadOnlyGuard(new PrismaClient({ adapter: new PrismaPg(pool) }));

afterAll(async () => {
  await guarded.$disconnect();
  await pool.end();
});

describe("build read-only guard", () => {
  it("allows reads", async () => {
    await expect(guarded.siteSettings.findUnique({ where: { id: "main" } })).resolves.toBeDefined();
    await expect(guarded.project.count()).resolves.toBeTypeOf("number");
  });

  it.each([
    [
      "upsert",
      () =>
        guarded.siteSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }),
    ],
    [
      "create",
      () => guarded.contactMessage.create({ data: { name: "a", email: "a@b.c", message: "m" } }),
    ],
    ["updateMany", () => guarded.project.updateMany({ data: { featured: true } })],
    ["deleteMany", () => guarded.comment.deleteMany()],
    ["$executeRaw", () => guarded.$executeRaw`DELETE FROM "Comment"`],
    ["$queryRawUnsafe", () => guarded.$queryRawUnsafe(`SELECT 1`)],
  ])("rejects %s", async (_name, run) => {
    await expect(run()).rejects.toBeInstanceOf(BuildWriteError);
  });
});
