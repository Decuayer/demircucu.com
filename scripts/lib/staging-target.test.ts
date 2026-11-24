import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkStagingTarget } from "./staging-target";

const STAGING = "stagingstagingstagi1";
const PROD = "prodprodprodprodprod";
const OTHER = "otherotherotherother";
const digests = [createHash("sha256").update(PROD).digest("hex")];
const url = (ref: string) =>
  `postgresql://postgres.${ref}:pw@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`;
const env = (ref: string, extra: Record<string, string> = {}) => ({
  DB_TARGET: "staging",
  DATABASE_URL: url(ref),
  DIRECT_URL: url(ref).replace(":6543", ":5432"),
  ...extra,
});

describe("checkStagingTarget", () => {
  it("allows the staging project with an explicit opt-in", () => {
    expect(checkStagingTarget(env(STAGING), STAGING, digests)).toEqual([]);
  });

  it("requires DB_TARGET=staging", () => {
    expect(checkStagingTarget({ ...env(STAGING), DB_TARGET: "" }, STAGING, digests)).toContain(
      "DB_TARGET=staging is required",
    );
  });

  it("refuses production even when it is named as the staging ref", () => {
    const problems = checkStagingTarget(env(PROD), PROD, digests);
    expect(problems).toContain("the expected staging ref is the production project");
    expect(problems).toContain("DIRECT_URL points at production");
  });

  it("refuses another project and local databases", () => {
    expect(checkStagingTarget(env(OTHER), STAGING, digests)).toContain(
      "DATABASE_URL is not the staging project",
    );
    expect(
      checkStagingTarget(
        {
          DB_TARGET: "staging",
          DATABASE_URL: "postgresql://localhost/x",
          DIRECT_URL: url(STAGING),
        },
        STAGING,
        digests,
      ),
    ).toEqual(["DATABASE_URL is not the staging project"]);
  });

  it("needs a known ref and never echoes values", () => {
    const problems = checkStagingTarget(env(STAGING), null, digests);
    expect(problems).toContain("the expected staging project ref is unknown");
    expect(problems.join(" ")).not.toContain("pw");
  });
});
