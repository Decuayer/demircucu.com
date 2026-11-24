/**
 * Runs once per server instance before it accepts requests. Throwing here stops a Preview
 * deployment that points at production Supabase from serving anything (the build-time check in
 * next.config.ts is the first line of defence).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertPreviewIsolation } = await import("@/lib/env/preview-guard");
  assertPreviewIsolation();
}
