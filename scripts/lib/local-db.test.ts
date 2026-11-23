import { describe, expect, it } from "vitest";
import { findNonLocalDatabaseVars, isLocalDatabaseUrl } from "./local-db";

const LOCAL = "postgresql://postgres:postgres@localhost:54329/demircucu_dev";
const REMOTE = "postgresql://user:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

describe("isLocalDatabaseUrl", () => {
  it.each([
    LOCAL,
    "postgresql://u@127.0.0.1/db",
    "postgresql://u@[::1]/db",
    "postgresql://u@postgres/db",
  ])("accepts %s", (url) => expect(isLocalDatabaseUrl(url)).toBe(true));

  it("rejects remote and malformed urls", () => {
    expect(isLocalDatabaseUrl(REMOTE)).toBe(false);
    expect(isLocalDatabaseUrl("not a url")).toBe(false);
  });
});

describe("findNonLocalDatabaseVars", () => {
  it("passes when everything set is local", () => {
    expect(findNonLocalDatabaseVars({ DATABASE_URL: LOCAL, DIRECT_URL: LOCAL })).toEqual([]);
  });

  // Regression: a remote DATABASE_URL must not be masked by a local DIRECT_URL from .env.local.
  it("flags a remote DATABASE_URL even when DIRECT_URL is local", () => {
    expect(findNonLocalDatabaseVars({ DATABASE_URL: REMOTE, DIRECT_URL: LOCAL })).toEqual([
      "DATABASE_URL",
    ]);
  });

  it("flags every remote variable and ignores unset ones", () => {
    expect(
      findNonLocalDatabaseVars({
        DATABASE_URL: REMOTE,
        SHADOW_DATABASE_URL: REMOTE,
        DIRECT_URL: "",
      }),
    ).toEqual(["DATABASE_URL", "SHADOW_DATABASE_URL"]);
  });
});
