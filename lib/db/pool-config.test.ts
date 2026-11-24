import { describe, expect, it } from "vitest";
import {
  assertTransactionPooler,
  BUILD_PHASE,
  createPoolConfig,
  DEFAULT_POOL_MAX,
  isBuildPhase,
} from "./pool-config";

describe("createPoolConfig", () => {
  it("uses a small pool with short idle and connect timeouts by default", () => {
    const config = createPoolConfig("postgresql://localhost/db", {});
    expect(config).toMatchObject({
      connectionString: "postgresql://localhost/db",
      max: DEFAULT_POOL_MAX,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    expect(DEFAULT_POOL_MAX).toBeLessThanOrEqual(3);
  });

  it("accepts a positive DATABASE_POOL_MAX override", () => {
    expect(createPoolConfig(undefined, { DATABASE_POOL_MAX: "1" }).max).toBe(1);
  });

  it.each(["0", "-2", "abc", ""])("ignores invalid DATABASE_POOL_MAX %j", (value) => {
    expect(createPoolConfig(undefined, { DATABASE_POOL_MAX: value }).max).toBe(DEFAULT_POOL_MAX);
  });
});

describe("build phase", () => {
  it("limits every build worker to a single connection", () => {
    const env = { NEXT_PHASE: BUILD_PHASE, DATABASE_POOL_MAX: "10" };
    expect(isBuildPhase(env)).toBe(true);
    expect(createPoolConfig("postgresql://localhost/db", env).max).toBe(1);
  });

  it("keeps the runtime pool size outside the build", () => {
    expect(createPoolConfig(undefined, { NEXT_PHASE: "phase-production-server" }).max).toBe(
      DEFAULT_POOL_MAX,
    );
  });
});

describe("assertTransactionPooler", () => {
  const pooler = (port: string) =>
    `postgresql://postgres.ref:secret@aws-1-eu-west-1.pooler.supabase.com${port}/postgres`;

  it("accepts the transaction pooler", () => {
    expect(() => assertTransactionPooler(pooler(":6543"))).not.toThrow();
  });

  it.each([":5432", ""])("rejects the session pooler (port %j)", (port) => {
    expect(() => createPoolConfig(pooler(port), {})).toThrow(/transaction pooler/);
  });

  it("never includes credentials in the error", () => {
    expect(() => assertTransactionPooler(pooler(":5432"))).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret") }),
    );
  });

  it.each([
    "postgresql://postgres:postgres@localhost:54329/demircucu_dev",
    "postgresql://postgres:x@db.abcdefghij.supabase.co:5432/postgres",
    "not a url",
    undefined,
  ])("ignores non-pooler connection strings: %s", (url) => {
    expect(() => assertTransactionPooler(url)).not.toThrow();
  });
});
