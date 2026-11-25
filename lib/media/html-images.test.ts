import { describe, expect, it } from "vitest";
import { optimizeHtmlImages } from "./html-images";

const BASE = "https://abc.supabase.co";
const url = (path: string) => `${BASE}/storage/v1/object/public/media/${path}`;
const sizes = new Map([
  ["github/repo/big.png", { width: 2400, height: 1200 }],
  ["blog/unknown.png", { width: null, height: null }],
]);

describe("optimizeHtmlImages", () => {
  it("serves own images through the optimizer with dimensions and a responsive srcset", () => {
    const html = `<p><img src="${url("github/repo/big.png")}" alt="Diagram"></p>`;
    const out = optimizeHtmlImages(html, sizes, { baseUrl: BASE });
    expect(out).toContain('width="2400"');
    expect(out).toContain('height="1200"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
    expect(out).toMatch(/src="\/_next\/image\?url=[^"]*big\.png&amp;w=\d+&amp;q=75"/);
    expect(out).toMatch(/srcset="[^"]*w=640[^"]* 640w,/);
    expect(out).toContain('sizes="(min-width: 896px) 832px, 100vw"');
    expect(out).toContain('alt="Diagram"');
  });

  it("keeps a width set by the author as a fixed 1x/2x size", () => {
    const html = `<img src="${url("github/repo/big.png")}" width="120" alt="Logo">`;
    const out = optimizeHtmlImages(html, sizes, { baseUrl: BASE });
    expect(out).toContain('width="120"');
    expect(out).toContain('height="60"');
    expect(out).toMatch(/srcset="[^"]* 1x, [^"]* 2x"/);
    expect(out).not.toContain("sizes=");
  });

  it("only adds lazy loading to external images and images without known size", () => {
    const badge = `<img src="https://img.shields.io/badge/x-y-green" alt="badge">`;
    const unknown = `<img src="${url("blog/unknown.png")}" alt="">`;
    const out = optimizeHtmlImages(badge + unknown, sizes, { baseUrl: BASE });
    expect(out).toContain('src="https://img.shields.io/badge/x-y-green"');
    expect(out).toContain(`src="${url("blog/unknown.png")}"`);
    expect(out.match(/loading="lazy"/g)).toHaveLength(2);
    expect(out).not.toContain("srcset");
  });

  it("keeps an explicit eager loading and escapes attribute values", () => {
    const html = `<img src="${url("github/repo/big.png")}" alt="a &quot;b&quot; &lt;c&gt;" loading="eager">`;
    const out = optimizeHtmlImages(html, sizes, { baseUrl: BASE });
    expect(out).toContain('loading="eager"');
    expect(out).toContain('alt="a &quot;b&quot; &lt;c>"');
    expect(out).not.toContain("<c>");
  });

  it("leaves HTML without images unchanged", () => {
    expect(optimizeHtmlImages("<p>Hello</p>", sizes, { baseUrl: BASE })).toBe("<p>Hello</p>");
  });
});
