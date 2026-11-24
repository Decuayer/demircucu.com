import { extractSupabaseRef, isProductionRef, PRODUCTION_REF_SHA256 } from "./supabase-ref";

/** Variables that can point the app at a Supabase project. */
export const SUPABASE_TARGET_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "DATABASE_URL",
  "DIRECT_URL",
] as const;

export class ProductionDataInPreviewError extends Error {
  constructor(variables: string[]) {
    super(
      `Refusing to start: VERCEL_ENV=preview but ${variables.join(", ")} point(s) at the production ` +
        "Supabase project. Preview deployments must use the staging project.",
    );
    this.name = "ProductionDataInPreviewError";
  }
}

/**
 * Throws when a Preview deployment is configured with production Supabase credentials. Runs at
 * build time (next.config.ts) and at server start (instrumentation.ts), so a misconfigured Preview
 * environment can neither build nor serve requests. Error messages list variable names only.
 */
export function assertPreviewIsolation(
  env: Record<string, string | undefined> = process.env,
  productionDigests: readonly string[] = PRODUCTION_REF_SHA256,
): void {
  if (env.VERCEL_ENV !== "preview") return;
  const offending = SUPABASE_TARGET_VARIABLES.filter((name) =>
    isProductionRef(extractSupabaseRef(env[name]), productionDigests),
  );
  if (offending.length > 0) throw new ProductionDataInPreviewError(offending);
}
