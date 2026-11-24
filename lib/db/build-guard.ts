import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Operations that can change data. Raw queries are included because the client cannot tell a
 * read from a write in arbitrary SQL; no build-time code path needs raw SQL.
 */
const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
  "$executeRaw",
  "$executeRawUnsafe",
  "$queryRaw",
  "$queryRawUnsafe",
  "$runCommandRaw",
]);

export function isWriteOperation(operation: string): boolean {
  return WRITE_OPERATIONS.has(operation);
}

export class BuildWriteError extends Error {
  constructor(model: string | undefined, operation: string) {
    super(
      `Database writes are not allowed during next build (${model ? `${model}.` : ""}${operation}).`,
    );
    this.name = "BuildWriteError";
  }
}

/**
 * Wraps the client so that every write fails while `next build` prerenders pages. Builds read
 * content for the static shell; a write there would run against whichever database the build
 * environment points at (staging for Preview, production for Production).
 */
export function withBuildReadOnlyGuard(client: PrismaClient): PrismaClient {
  const guarded = client.$extends(
    Prisma.defineExtension({
      name: "build-read-only",
      query: {
        async $allOperations({ model, operation, args, query }) {
          if (isWriteOperation(operation)) throw new BuildWriteError(model, operation);
          return query(args);
        },
      },
    }),
  );
  // The extension only adds a runtime check; the public API is unchanged.
  return guarded as unknown as PrismaClient;
}
