import { describe, expect, it } from "vitest";
import { BuildWriteError, isWriteOperation } from "./build-guard";

describe("isWriteOperation", () => {
  it.each([
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
  ])("treats %s as a write", (operation) => {
    expect(isWriteOperation(operation)).toBe(true);
  });

  it.each([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
  ])("allows %s", (operation) => {
    expect(isWriteOperation(operation)).toBe(false);
  });
});

describe("BuildWriteError", () => {
  it("names the model and operation", () => {
    expect(new BuildWriteError("SiteSettings", "upsert").message).toContain("SiteSettings.upsert");
  });
});
