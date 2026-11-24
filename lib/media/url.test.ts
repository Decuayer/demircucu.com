import { describe, expect, it } from "vitest";
import { isMediaPath, mediaPathFromUrl, mediaPathsInHtml, mediaUrl } from "./url";
import { attachmentHref, attachmentPaths, toAttachments } from "./attachments";

const BASE = "https://abc.supabase.co";
const PREFIX = `${BASE}/storage/v1/object/public/media/`;

describe("mediaUrl", () => {
  it("builds the public object URL from a storage path", () => {
    expect(mediaUrl("projects/a b.png", BASE)).toBe(`${PREFIX}projects/a%20b.png`);
  });

  it("returns null for an empty path or a missing / invalid base URL", () => {
    expect(mediaUrl(null, BASE)).toBeNull();
    expect(mediaUrl("", BASE)).toBeNull();
    expect(mediaUrl("projects/a.png", undefined)).toBeNull();
    expect(mediaUrl("projects/a.png", "not a url")).toBeNull();
  });

  it("ignores a trailing path on the base URL", () => {
    expect(mediaUrl("a/b.png", `${BASE}/`)).toBe(`${PREFIX}a/b.png`);
  });
});

describe("isMediaPath", () => {
  it.each(["projects/1f0c.png", "github/owner-repo/abc.webp", "settings/favicon.ico"])(
    "accepts %s",
    (path) => expect(isMediaPath(path)).toBe(true),
  );

  it.each([
    "",
    "file.png",
    "/projects/a.png",
    "projects/../secret",
    "projects/./a.png",
    "Projects/a.png",
    "projects/a b.png",
    "https://x/y.png",
    `projects/${"a".repeat(600)}`,
  ])("rejects %j", (path) => expect(isMediaPath(path)).toBe(false));
});

describe("mediaPathFromUrl", () => {
  it("extracts the path of an own-bucket URL", () => {
    expect(mediaPathFromUrl(`${PREFIX}projects/a.png`, BASE)).toBe("projects/a.png");
    expect(mediaPathFromUrl(`${PREFIX}projects/a.png?v=1`, BASE)).toBe("projects/a.png");
  });

  it("rejects other hosts, buckets, paths and garbage", () => {
    expect(
      mediaPathFromUrl("https://other.supabase.co/storage/v1/object/public/media/a/b.png", BASE),
    ).toBeNull();
    expect(mediaPathFromUrl(`${BASE}/storage/v1/object/public/other/a/b.png`, BASE)).toBeNull();
    expect(mediaPathFromUrl(`${BASE}/storage/v1/object/sign/media/a/b.png`, BASE)).toBeNull();
    expect(mediaPathFromUrl(`${PREFIX}%E0%A4%A`, BASE)).toBeNull();
    expect(mediaPathFromUrl("not a url", BASE)).toBeNull();
    expect(mediaPathFromUrl(`${PREFIX}a/b.png`, undefined)).toBeNull();
  });
});

describe("mediaPathsInHtml", () => {
  it("collects distinct own-bucket image paths and skips external images", () => {
    const html = `<p><img src="${PREFIX}blog/a.png" alt=""><img alt="" src='${PREFIX}blog/b.png'>
      <img src="${PREFIX}blog/a.png"><img src="https://example.com/x.png"></p>
      <a href="${PREFIX}blog/c.pdf">doc</a>`;
    expect(mediaPathsInHtml(html, BASE)).toEqual(["blog/a.png", "blog/b.png"]);
  });

  it("handles empty input", () => {
    expect(mediaPathsInHtml(null, BASE)).toEqual([]);
    expect(mediaPathsInHtml("", BASE)).toEqual([]);
  });
});

describe("attachments", () => {
  it("prefers the storage path over a legacy url and keeps external links", () => {
    const parsed = toAttachments([
      { name: "Doc", url: `${PREFIX}general/doc.pdf`, path: "general/doc.pdf" },
      { name: "Ext", url: "https://example.com/x.pdf" },
      { name: 5, url: "x" },
      { name: "Empty" },
      null,
    ]);
    expect(parsed).toEqual([
      { name: "Doc", path: "general/doc.pdf" },
      { name: "Ext", url: "https://example.com/x.pdf" },
    ]);
    expect(attachmentPaths(parsed)).toEqual(["general/doc.pdf"]);
    expect(attachmentHref(parsed[1]!)).toBe("https://example.com/x.pdf");
  });

  it("returns an empty list for non-array JSON", () => {
    expect(toAttachments(null)).toEqual([]);
    expect(toAttachments({})).toEqual([]);
    expect(attachmentPaths(undefined)).toEqual([]);
  });
});
