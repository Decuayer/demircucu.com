import {
  extractSupabaseRef,
  isProductionRef,
  PRODUCTION_REF_SHA256,
} from "../../lib/env/supabase-ref";

/**
 * Permission check for commands that write to the staging database (migrations, seed).
 *
 * - The caller must opt in explicitly (`DB_TARGET=staging`).
 * - Every database variable must belong to the expected staging project. The expected ref comes
 *   from `.env.staging.local` (locally) or the STAGING_SUPABASE_REF secret (CI); it is never
 *   written to the repository.
 * - The production project is refused in every case.
 *
 * Returns problems as messages that name variables only, never values.
 */
export function checkStagingTarget(
  env: Record<string, string | undefined>,
  expectedRef: string | null | undefined,
  productionDigests: readonly string[] = PRODUCTION_REF_SHA256,
): string[] {
  const problems: string[] = [];
  if (env.DB_TARGET !== "staging") problems.push("DB_TARGET=staging is required");
  if (!expectedRef) problems.push("the expected staging project ref is unknown");
  if (expectedRef && isProductionRef(expectedRef, productionDigests)) {
    problems.push("the expected staging ref is the production project");
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = env[name];
    if (!value) {
      problems.push(`${name} is not set`);
      continue;
    }
    const ref = extractSupabaseRef(value);
    if (isProductionRef(ref, productionDigests)) problems.push(`${name} points at production`);
    else if (!ref || ref !== expectedRef) problems.push(`${name} is not the staging project`);
  }
  return problems;
}
