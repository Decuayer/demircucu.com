import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertPreviewIsolation, ProductionDataInPreviewError } from "./preview-guard";
import { extractSupabaseRef, isProductionRef, PRODUCTION_REF_SHA256 } from "./supabase-ref";

// Synthetic refs: the real production ref never appears in the repository.
const PROD_REF = "prodprodprodprodprod";
const STAGING_REF = "stagingstagingstagi1";
const digest = (ref: string) => createHash("sha256").update(ref).digest("hex");
const DIGESTS = [digest(PROD_REF)];

const project = (ref: string) => `https://${ref}.supabase.co`;
const pooler = (ref: string) =>
  `postgresql://postgres.${ref}:pw@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`;
const direct = (ref: string) => `postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`;

describe("extractSupabaseRef", () => {
  it.each([
    [project(STAGING_REF), STAGING_REF],
    [pooler(STAGING_REF), STAGING_REF],
    [direct(STAGING_REF), STAGING_REF],
    ["http://127.0.0.1:54321", null],
    ["postgresql://postgres:postgres@localhost:54322/postgres", null],
    ["garbage", null],
    [undefined, null],
  ])("%s -> %s", (input, expected) => {
    expect(extractSupabaseRef(input)).toBe(expected);
  });
});

describe("isProductionRef", () => {
  it("matches by digest", () => {
    expect(isProductionRef(PROD_REF, DIGESTS)).toBe(true);
    expect(isProductionRef(STAGING_REF, DIGESTS)).toBe(false);
    expect(isProductionRef(null, DIGESTS)).toBe(false);
  });

  it("ships at least one production digest", () => {
    expect(PRODUCTION_REF_SHA256.length).toBeGreaterThan(0);
    for (const value of PRODUCTION_REF_SHA256) expect(value).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("assertPreviewIsolation", () => {
  const stagingEnv = {
    NEXT_PUBLIC_SUPABASE_URL: project(STAGING_REF),
    DATABASE_URL: pooler(STAGING_REF),
    DIRECT_URL: direct(STAGING_REF),
  };

  it("allows preview with staging credentials", () => {
    expect(() =>
      assertPreviewIsolation({ VERCEL_ENV: "preview", ...stagingEnv }, DIGESTS),
    ).not.toThrow();
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL", "DIRECT_URL"] as const)(
    "refuses to start when %s points at production on preview",
    (name) => {
      const value = { NEXT_PUBLIC_SUPABASE_URL: project, DATABASE_URL: pooler, DIRECT_URL: direct }[
        name
      ](PROD_REF);
      const run = () =>
        assertPreviewIsolation({ VERCEL_ENV: "preview", ...stagingEnv, [name]: value }, DIGESTS);
      expect(run).toThrow(ProductionDataInPreviewError);
      expect(run).toThrow(name);
    },
  );

  it("never prints the offending value", () => {
    try {
      assertPreviewIsolation({ VERCEL_ENV: "preview", DATABASE_URL: pooler(PROD_REF) }, DIGESTS);
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(PROD_REF);
      expect(String(error)).not.toContain("pw");
    }
  });

  it.each(["production", "development", undefined])("does nothing when VERCEL_ENV=%s", (env) => {
    expect(() =>
      assertPreviewIsolation({ VERCEL_ENV: env, DATABASE_URL: pooler(PROD_REF) }, DIGESTS),
    ).not.toThrow();
  });
});
