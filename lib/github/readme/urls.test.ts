import { describe, expect, it } from "vitest";
import {
  classifyImage,
  classifyLink,
  firstSrcsetUrl,
  parseGithubFileUrl,
  resolveRepoPath,
  themeOfImage,
} from "./urls";

const ctx = { owner: "Decuayer", repo: "aegis-dispatch", branch: "main", readmePath: "README.md" };
const nested = { ...ctx, readmePath: "docs/guide/README.md" };
const raw = (path: string) =>
  `https://raw.githubusercontent.com/Decuayer/aegis-dispatch/main/${path}`;

describe("resolveRepoPath", () => {
  it.each([
    ["./docs/a.png", "README.md", "docs/a.png"],
    ["docs/a.png", "README.md", "docs/a.png"],
    ["../a.png", "docs/README.md", "a.png"],
    ["/a.png", "docs/guide/README.md", "a.png"],
    ["img/x.png", "docs/guide/README.md", "docs/guide/img/x.png"],
    ["../../../../etc/passwd", "docs/README.md", "etc/passwd"],
    ["docs/My%20Shot.png?raw=1#frag", "README.md", "docs/My Shot.png"],
  ])("%s from %s -> %s", (ref, readme, expected) => {
    expect(resolveRepoPath(ref, readme)).toBe(expected);
  });

  it("returns null for an empty path", () => {
    expect(resolveRepoPath("?x", "README.md")).toBeNull();
    expect(resolveRepoPath("./", "README.md")).toBeNull();
  });
});

describe("parseGithubFileUrl", () => {
  it("parses raw, blob and raw-host URLs", () => {
    expect(parseGithubFileUrl("https://github.com/o/r/raw/main/docs/a.png")).toMatchObject({
      owner: "o",
      repo: "r",
      ref: "main",
      path: "docs/a.png",
      view: "raw",
    });
    expect(parseGithubFileUrl("https://github.com/o/r/blob/main/a.png?raw=true")?.view).toBe("raw");
    expect(parseGithubFileUrl("https://github.com/o/r/blob/main/a.pdf")?.view).toBe("blob");
    expect(parseGithubFileUrl("https://raw.githubusercontent.com/o/r/v1/x/y.png")).toMatchObject({
      ref: "v1",
      path: "x/y.png",
    });
  });

  it("rejects other URLs", () => {
    expect(parseGithubFileUrl("https://github.com/o/r/tree/main/docs")).toBeNull();
    expect(parseGithubFileUrl("https://example.com/o/r/raw/main/a.png")).toBeNull();
    expect(parseGithubFileUrl("not a url")).toBeNull();
  });
});

describe("classifyImage", () => {
  it.each([
    ["./docs/images/a.png", raw("docs/images/a.png")],
    ["docs/images/a.png", raw("docs/images/a.png")],
    ["/a.png", raw("a.png")],
    [
      "https://github.com/Decuayer/aegis-dispatch/raw/main/docs/images/a.png",
      raw("docs/images/a.png"),
    ],
    ["https://github.com/Decuayer/aegis-dispatch/blob/main/docs/b.png?raw=true", raw("docs/b.png")],
    ["https://raw.githubusercontent.com/Decuayer/aegis-dispatch/main/c.png", raw("c.png")],
  ])("repository image %s", (src, url) => {
    expect(classifyImage(src, ctx)).toMatchObject({ kind: "repo", url });
  });

  it("resolves relative paths against a nested README", () => {
    expect(classifyImage("../shot.png", nested)).toMatchObject({
      url: raw("docs/shot.png"),
      repoPath: "docs/shot.png",
    });
  });

  it("marks images of other repositories without a repo path", () => {
    expect(classifyImage("https://github.com/other/lib/raw/main/logo.png", ctx)).toEqual({
      kind: "repo",
      url: "https://raw.githubusercontent.com/other/lib/main/logo.png",
      repoPath: null,
    });
  });

  it.each([
    "https://github.com/user-attachments/assets/4f3a9c1e-1234-4abc-9def-0123456789ab",
    "https://private-user-images.githubusercontent.com/1/2.png?jwt=x",
    "https://user-images.githubusercontent.com/1/2.png",
  ])("attachment %s", (src) => {
    expect(classifyImage(src, ctx).kind).toBe("attachment");
  });

  it.each([
    "https://img.shields.io/badge/Next.js-16-black",
    "https://github.com/Decuayer/aegis-dispatch/actions/workflows/ci.yml/badge.svg",
    "https://github.com/o/r/workflows/CI/badge.svg",
    "https://codecov.io/gh/o/r/branch/main/graph/badge.svg",
  ])("badge %s stays external", (src) => {
    expect(classifyImage(src, ctx)).toEqual({ kind: "badge", url: src });
  });

  it("upgrades http and protocol-relative URLs", () => {
    expect(classifyImage("http://example.com/a.png", ctx)).toEqual({
      kind: "external",
      url: "https://example.com/a.png",
    });
    expect(classifyImage("//example.com/a.png", ctx)).toEqual({
      kind: "external",
      url: "https://example.com/a.png",
    });
  });

  it.each(["", "#x", "data:image/png;base64,AAAA", "javascript:alert(1)", "ftp://x/y.png", null])(
    "invalid %s",
    (src) => {
      expect(classifyImage(src, ctx)).toEqual({ kind: "invalid" });
    },
  );
});

describe("classifyLink", () => {
  it("keeps anchors", () => {
    expect(classifyLink("#installation", ctx)).toEqual({ kind: "anchor", href: "#installation" });
  });

  it("opens relative files on GitHub, keeping the fragment", () => {
    expect(classifyLink("./CONTRIBUTING.md", ctx)).toEqual({
      kind: "external",
      href: "https://github.com/Decuayer/aegis-dispatch/blob/main/CONTRIBUTING.md",
    });
    expect(classifyLink("docs/x.md#usage", ctx)).toEqual({
      kind: "external",
      href: "https://github.com/Decuayer/aegis-dispatch/blob/main/docs/x.md#usage",
    });
  });

  it("maps repository PDFs to documents", () => {
    expect(classifyLink("docs/report.pdf", ctx)).toMatchObject({
      kind: "document",
      repoPath: "docs/report.pdf",
    });
    expect(
      classifyLink(
        "https://github.com/Decuayer/aegis-dispatch/blob/main/docs/Design%20Spec.pdf",
        ctx,
      ),
    ).toMatchObject({ kind: "document", repoPath: "docs/Design Spec.pdf" });
    expect(classifyLink("https://github.com/other/repo/blob/main/a.pdf", ctx).kind).toBe(
      "external",
    );
  });

  it("drops unsafe schemes", () => {
    expect(classifyLink("javascript:alert(1)", ctx)).toEqual({ kind: "invalid" });
    expect(classifyLink("data:text/html,x", ctx)).toEqual({ kind: "invalid" });
    expect(classifyLink("mailto:a@b.c", ctx)).toEqual({ kind: "external", href: "mailto:a@b.c" });
  });
});

describe("theme helpers", () => {
  it("reads picture media and #gh-*-mode-only fragments", () => {
    expect(themeOfImage("a.png", "(prefers-color-scheme: dark)")).toBe("dark");
    expect(themeOfImage("a.png", "(prefers-color-scheme: light)")).toBe("light");
    expect(themeOfImage("a.png#gh-dark-mode-only")).toBe("dark");
    expect(themeOfImage("a.png#gh-light-mode-only")).toBe("light");
    expect(themeOfImage("a.png")).toBeNull();
  });

  it("takes the first srcset candidate", () => {
    expect(firstSrcsetUrl("a.png 1x, b.png 2x")).toBe("a.png");
    expect(firstSrcsetUrl("")).toBeNull();
  });
});
