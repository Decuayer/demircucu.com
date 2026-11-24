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
    const result = await uploadFileToStorage(new Uint8Array([1]), {
      ext: "png",
      contentType: "image/png",
      folder: "general",
    });
    expect(result).toEqual({ success: false, error: "storageUnavailable" });
  });
});

describe("uploadFileToStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uploads under a random name with an immutable cache header and never lists buckets", async () => {
    const upload = vi.fn(async (path: string) => ({ data: { path }, error: null }));
    const listBuckets = vi.fn();
    const getPublicUrl = vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn.test/${path}` },
    }));
    createClient.mockReturnValueOnce({
      storage: { listBuckets, from: () => ({ upload, getPublicUrl }) },
    } as never);
    const { uploadFileToStorage } = await import("./storage");
    const result = await uploadFileToStorage(new Uint8Array([1]), {
      ext: "png",
      contentType: "image/png",
      folder: "blog",
    });
    expect(result).toMatchObject({
      success: true,
      path: expect.stringMatching(/^blog\/[0-9a-f-]{36}\.png$/),
    });
    expect(upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Uint8Array),
      expect.objectContaining({
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      }),
    );
    expect(listBuckets).not.toHaveBeenCalled();
  });
});
