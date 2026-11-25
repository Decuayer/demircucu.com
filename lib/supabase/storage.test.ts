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

  it("reports missing configuration as a signing failure instead of throwing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createIncomingUpload } = await import("./storage");
    expect(await createIncomingUpload()).toEqual({ ok: false });
  });
});

describe("signed uploads", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs a random incoming/ path and never lists buckets", async () => {
    const createSignedUploadUrl = vi.fn(async (path: string) => ({
      data: { signedUrl: `https://example.supabase.co/sign/${path}?token=t`, path, token: "t" },
      error: null,
    }));
    const listBuckets = vi.fn();
    createClient.mockReturnValueOnce({
      storage: { listBuckets, from: () => ({ createSignedUploadUrl }) },
    } as never);
    const { createIncomingUpload } = await import("./storage");
    const result = await createIncomingUpload();
    expect(result).toMatchObject({
      ok: true,
      path: expect.stringMatching(/^incoming\/[0-9a-f-]{36}$/),
    });
    expect(listBuckets).not.toHaveBeenCalled();
  });

  it("stores content-addressed objects with an immutable cache header", async () => {
    const upload = vi.fn(async () => ({ data: {}, error: null }));
    createClient.mockReturnValueOnce({ storage: { from: () => ({ upload }) } } as never);
    const { putObject } = await import("./storage");
    await putObject("blog/abc.png", new Uint8Array([1]), "image/png");
    expect(upload).toHaveBeenCalledWith(
      "blog/abc.png",
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/png", cacheControl: "31536000" }),
    );
  });

  it("refuses downloads above the limit", async () => {
    const blob = new Blob([new Uint8Array(10)]);
    createClient.mockReturnValueOnce({
      storage: { from: () => ({ download: async () => ({ data: blob, error: null }) }) },
    } as never);
    const { downloadObject } = await import("./storage");
    expect(await downloadObject("incoming/x", 5)).toEqual({ ok: false, reason: "tooLarge" });
  });

  it("purges only incoming objects older than the cut-off", async () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    const remove = vi.fn(async () => ({ error: null }));
    const list = vi.fn(async () => ({
      data: [
        { name: "old", created_at: "2026-11-24T00:00:00Z" },
        { name: "new", created_at: "2026-11-25T11:00:00Z" },
      ],
      error: null,
    }));
    createClient.mockReturnValueOnce({ storage: { from: () => ({ list, remove }) } } as never);
    const { purgeStaleIncoming } = await import("./storage");
    expect(await purgeStaleIncoming(24 * 3600_000, now)).toBe(1);
    expect(list).toHaveBeenCalledWith("incoming", { limit: 100 });
    expect(remove).toHaveBeenCalledWith(["incoming/old"]);
  });
});
