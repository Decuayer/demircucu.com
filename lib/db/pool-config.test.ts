import { describe, expect, it } from "vitest";
import { createPoolConfig, DEFAULT_POOL_MAX } from "./pool-config";

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
