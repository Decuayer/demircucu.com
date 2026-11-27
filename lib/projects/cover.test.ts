import { describe, expect, it } from "vitest";
import { coverFit, firstReadmeImagePath, pickCover, type CoverMedia } from "./cover";

const base = "https://p.supabase.co/storage/v1/object/public/media/";
const toPath = (url: string) => (url.startsWith(base) ? url.slice(base.length) : null);

describe("firstReadmeImagePath", () => {
  it("skips badges and foreign images", () => {
    const html = `<p><img src="https://img.shields.io/x" class="readme-badge">
      <img src="https://example.com/a.png">
      <img alt="Logo" src="${base}github/r/aa.png" width="100"></p>`;
    expect(firstReadmeImagePath(html, toPath)).toBe("github/r/aa.png");
  });

  it("is null without images", () => {
    expect(firstReadmeImagePath("<h1>Title</h1>", toPath)).toBeNull();
    expect(firstReadmeImagePath(null, toPath)).toBeNull();
  });
});

describe("coverFit", () => {
  it("contains logos and square images, fills wide screenshots", () => {
    expect(coverFit(1600, 900)).toBe("cover");
    expect(coverFit(400, 200)).toBe("contain");
    expect(coverFit(1000, 1000)).toBe("contain");
    expect(coverFit(null, null)).toBe("contain");
  });
});

describe("pickCover", () => {
  const media = new Map<string, CoverMedia>([
    [
      "projects/admin.png",
      { path: "projects/admin.png", width: 1600, height: 900, blurDataUrl: "b" },
    ],
    [
      "github/r/logo.png",
      { path: "github/r/logo.png", width: 256, height: 256, blurDataUrl: null },
    ],
  ]);

  it("prefers the admin image, then the README image", () => {
    expect(pickCover("projects/admin.png", "github/r/logo.png", media)).toMatchObject({
      source: "admin",
      fit: "cover",
    });
    expect(pickCover(null, "github/r/logo.png", media)).toMatchObject({
      source: "readme",
      fit: "contain",
    });
  });

  it("ignores paths without a media row and returns null without any image", () => {
    expect(pickCover("projects/missing.png", "github/r/logo.png", media)?.source).toBe("readme");
    expect(pickCover(null, null, media)).toBeNull();
  });
});
