import { describe, expect, it } from "vitest";
import { DEFAULT_TEST_DATABASE_URL, resolveTestDatabaseUrl } from "./test-db";

describe("resolveTestDatabaseUrl", () => {
  it("defaults to the docker compose test database", () => {
    expect(resolveTestDatabaseUrl({})).toBe(DEFAULT_TEST_DATABASE_URL);
  });

  it.each([
    "postgresql://u:p@localhost:5432/db",
    "postgresql://u:p@127.0.0.1:5432/db",
    "postgresql://u:p@[::1]:5432/db",
    "postgresql://u:p@postgres:5432/db",
  ])("accepts local url %s", (url) => {
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
  });

  it("refuses remote hosts", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://u:p@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
      }),
    ).toThrow(/non-local/);
  });
});
