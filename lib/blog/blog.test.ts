import { describe, expect, it } from "vitest";
import { adjacentPosts } from "./adjacent";
import { shareLinks, shareUrl } from "./share";
import { headingSlug, withHeadingIds } from "./toc";

describe("headingSlug", () => {
  it("folds Turkish letters and punctuation", () => {
    expect(headingSlug("Ölçek ve ritim")).toBe("olcek-ve-ritim");
    expect(headingSlug("İçindekiler: ŞIĞ değil!")).toBe("icindekiler-sig-degil");
    expect(headingSlug("Café & naïve")).toBe("cafe-naive");
    expect(headingSlug("  --  ")).toBe("section");
    expect(headingSlug("a".repeat(120))).toHaveLength(80);
  });
});

describe("withHeadingIds", () => {
  it("gives h2 and h3 unique ids and lists them", () => {
    const { html, headings } = withHeadingIds(
      '<h2>Giriş</h2><p>x</p><h3 class="a" id="user-content-old">Alt <em>başlık</em></h3><h2>Giriş</h2><h4>Dört</h4><h2>Yorumlar &amp; notlar</h2>',
    );
    expect(headings).toEqual([
      { id: "giris", text: "Giriş", level: 2 },
      { id: "alt-baslik", text: "Alt başlık", level: 3 },
      { id: "giris-2", text: "Giriş", level: 2 },
      { id: "yorumlar-notlar", text: "Yorumlar & notlar", level: 2 },
    ]);
    expect(html).toContain('<h2 id="giris" tabindex="-1">Giriş</h2>');
    expect(html).toContain('<h3 id="alt-baslik" tabindex="-1" class="a">Alt <em>başlık</em></h3>');
    expect(html).toContain('<h2 id="giris-2" tabindex="-1">');
    expect(html).toContain("<h4>Dört</h4>");
    expect(html).not.toContain("user-content-old");
  });

  it("never reuses the page's own ids and skips empty headings in the list", () => {
    const { html, headings } = withHeadingIds("<h2>Main content</h2><h2> </h2>");
    expect(headings).toEqual([{ id: "main-content-2", text: "Main content", level: 2 }]);
    expect(html).toContain('<h2 id="section" tabindex="-1"> </h2>');
  });

  it("keeps HTML without headings as it is", () => {
    expect(withHeadingIds("<p>Merhaba</p>")).toEqual({ html: "<p>Merhaba</p>", headings: [] });
  });
});

describe("adjacentPosts", () => {
  const posts = [{ slug: "c" }, { slug: "b" }, { slug: "a" }];
  it("previous is older, next is newer", () => {
    expect(adjacentPosts(posts, "b")).toEqual({ previous: { slug: "a" }, next: { slug: "c" } });
    expect(adjacentPosts(posts, "c")).toEqual({ previous: { slug: "b" }, next: null });
    expect(adjacentPosts(posts, "a")).toEqual({ previous: null, next: { slug: "b" } });
    expect(adjacentPosts(posts, "x")).toEqual({ previous: null, next: null });
  });
});

describe("share", () => {
  it("tags the canonical URL and builds intent links", () => {
    const url = shareUrl("https://demircucu.com/tr/blog/a");
    expect(url).toBe("https://demircucu.com/tr/blog/a?utm_source=share");
    const links = shareLinks(url, "Başlık & alt");
    expect(new URL(links.x).searchParams.get("text")).toBe("Başlık & alt");
    expect(new URL(links.x).searchParams.get("url")).toBe(url);
    expect(new URL(links.linkedin).searchParams.get("url")).toBe(url);
  });
});
