import { describe, expect, it } from "vitest";
import { buildImagesConfig } from "./image-config";

describe("buildImagesConfig", () => {
  it("limits the optimizer to the project's media bucket", () => {
    const config = buildImagesConfig("https://abc.supabase.co");
    expect(config.remotePatterns?.[0]).toEqual({
      protocol: "https",
      hostname: "abc.supabase.co",
      pathname: "/storage/v1/object/public/media/**",
    });
    expect(JSON.stringify(config.remotePatterns)).not.toContain("*.supabase.co");
    expect(config.dangerouslyAllowLocalIP).toBeUndefined();
  });

  it("allows the local Supabase API only for a local URL", () => {
    const config = buildImagesConfig("http://127.0.0.1:54321");
    expect(config.remotePatterns?.[0]).toMatchObject({
      protocol: "http",
      hostname: "127.0.0.1",
      port: "54321",
    });
    expect(config.dangerouslyAllowLocalIP).toBe(true);
  });

  it("keeps only GitHub avatars without a Supabase URL", () => {
    const config = buildImagesConfig(undefined);
    expect(config.remotePatterns).toHaveLength(1);
    expect(config.formats).toEqual(["image/avif", "image/webp"]);
    expect(config.qualities).toEqual([75]);
  });
});
