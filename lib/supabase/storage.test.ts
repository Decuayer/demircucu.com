import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ storage: {} })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("getSupabaseAdmin", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not create a client at import time", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await import("./storage");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("throws a descriptive error when configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getSupabaseAdmin } = await import("./storage");
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("creates the client once and reuses it", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    const { getSupabaseAdmin } = await import("./storage");
    expect(getSupabaseAdmin()).toBe(getSupabaseAdmin());
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role",
      expect.objectContaining({ auth: { autoRefreshToken: false, persistSession: false } }),
    );
  });

  it("reports missing configuration as an upload failure instead of throwing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { uploadFileToStorage } = await import("./storage");
    const result = await uploadFileToStorage(Buffer.from("x"), "a.png", "image/png");
    expect(result).toEqual({ success: false, error: expect.stringMatching(/not configured/) });
  });
});
