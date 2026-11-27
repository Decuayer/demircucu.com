import { describe, expect, it } from "vitest";
import {
  languageAlternates,
  localizedPath,
  pageMetadata,
  plainDescription,
  PRIVATE_PAGE_METADATA,
  twitterHandle,
} from "./metadata";
import {
  absoluteUrl,
  blogPosting,
  breadcrumbs,
  jsonLd,
  person,
  softwareSourceCode,
  website,
} from "./json-ld";

const base = new URL("https://www.demircucu.com");

describe("metadata", () => {
  it("builds localized paths and hreflang with x-default in English", () => {
    expect(localizedPath("/", "tr")).toBe("/tr");
    expect(localizedPath("/blog/x", "en")).toBe("/en/blog/x");
    expect(languageAlternates("/projects/a")).toEqual({
      tr: "/tr/projects/a",
      en: "/en/projects/a",
      "x-default": "/en/projects/a",
    });
  });

  it("reads Twitter handles only from Twitter / X profile URLs", () => {
    expect(twitterHandle("https://x.com/demircucu")).toBe("@demircucu");
    expect(twitterHandle("https://twitter.com/demir_c/status/1")).toBe("@demir_c");
    expect(twitterHandle("https://github.com/demircucu")).toBeUndefined();
    expect(twitterHandle("not a url")).toBeUndefined();
    expect(twitterHandle(null)).toBeUndefined();
  });

  it("turns HTML into a short plain description", () => {
    expect(plainDescription("<p>Merhaba&nbsp;<b>dünya</b></p>")).toBe("Merhaba dünya");
    const long = plainDescription("kelime ".repeat(60), 40)!;
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("…")).toBe(true);
    expect(plainDescription("   ")).toBeUndefined();
  });

  it("assembles canonical, alternates, Open Graph and Twitter", () => {
    const meta = pageMetadata({
      locale: "tr",
      path: "/blog/x",
      title: "Başlık",
      description: "<p>Özet</p>",
      type: "article",
      publishedTime: "2025-01-02T00:00:00Z",
      tags: ["Python"],
      twitterCreator: "https://x.com/demircucu",
    });
    expect(meta.alternates).toEqual({
      canonical: "/tr/blog/x",
      languages: { tr: "/tr/blog/x", en: "/en/blog/x", "x-default": "/en/blog/x" },
    });
    expect(meta.openGraph).toMatchObject({
      type: "article",
      url: "/tr/blog/x",
      locale: "tr_TR",
      alternateLocale: ["en_US"],
      description: "Özet",
      publishedTime: "2025-01-02T00:00:00.000Z",
      tags: ["Python"],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", creator: "@demircucu" });
    expect(PRIVATE_PAGE_METADATA.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("json-ld", () => {
  it("escapes markup so content cannot close the script element", () => {
    const out = jsonLd({ "@type": "Thing", name: "</script><script>alert(1)</script> &  " });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toMatchObject({
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script> &  ",
    });
  });

  it("wraps several nodes in a @graph", () => {
    const parsed = JSON.parse(jsonLd([{ "@type": "A" }, { "@type": "B" }]));
    expect(parsed["@graph"]).toHaveLength(2);
  });

  it("builds Person and WebSite with stable ids and no empty fields", () => {
    const p = person({
      base,
      locale: "tr",
      name: "Demir Cücü",
      jobTitle: "",
      sameAs: ["https://github.com/x", null, undefined],
    });
    expect(p).toEqual({
      "@type": "Person",
      "@id": "https://www.demircucu.com/#person",
      name: "Demir Cücü",
      url: "https://www.demircucu.com/tr/about",
      sameAs: ["https://github.com/x"],
    });
    expect(website({ base, locale: "en", name: "demircucu.com" })).toMatchObject({
      "@id": "https://www.demircucu.com/#website",
      url: "https://www.demircucu.com/en",
      inLanguage: ["tr", "en"],
    });
  });

  it("builds BlogPosting, SoftwareSourceCode and breadcrumbs", () => {
    expect(
      blogPosting({
        base,
        locale: "en",
        path: "/blog/x",
        headline: "Title",
        datePublished: "2025-01-02T00:00:00Z",
        authorName: "Demir Cücü",
        keywords: ["A", "B"],
      }),
    ).toMatchObject({
      "@type": "BlogPosting",
      url: "https://www.demircucu.com/en/blog/x",
      dateModified: "2025-01-02T00:00:00.000Z",
      keywords: "A, B",
      author: { name: "Demir Cücü" },
    });
    expect(
      softwareSourceCode({
        base,
        locale: "tr",
        path: "/projects/p",
        name: "P",
        codeRepository: "https://github.com/a/p",
        programmingLanguage: "Swift",
      }),
    ).toMatchObject({ "@type": "SoftwareSourceCode", codeRepository: "https://github.com/a/p" });
    expect(breadcrumbs(base, "tr", [{ name: "Projeler", path: "/projects" }])).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Projeler",
          item: "https://www.demircucu.com/tr/projects",
        },
      ],
    });
    expect(absoluteUrl(base, "/", "en")).toBe("https://www.demircucu.com/en");
  });
});
