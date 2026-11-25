import { describe, expect, it } from "vitest";
import { classifyPath, isUntrackedArea } from "./paths";

describe("classifyPath", () => {
  it.each([
    ["/tr", { kind: "home" }, "/"],
    ["/en/", { kind: "home" }, "/"],
    ["/tr/about", { kind: "page", path: "/about" }, "/about"],
    ["/en/privacy", { kind: "page", path: "/privacy" }, "/privacy"],
    ["/tr/projects/tatum", { kind: "project", slug: "tatum" }, "/projects/tatum"],
    [
      "/tr/projects/Spotify-Stream",
      { kind: "project", slug: "Spotify-Stream" },
      "/projects/Spotify-Stream",
    ],
    [
      "/tr/projects/tatum/docs/abc123",
      { kind: "projectDoc", slug: "tatum", docId: "abc123" },
      "/projects/tatum/docs/abc123",
    ],
    ["/en/blog/hello-world", { kind: "blog", slug: "hello-world" }, "/blog/hello-world"],
    ["/tr/experience/cm1", { kind: "experience", id: "cm1" }, "/experience/cm1"],
    ["/tr/skills/react", { kind: "skill", slug: "react" }, "/skills/react"],
  ])("%s", (pathname, route, path) => {
    const result = classifyPath(pathname);
    expect(result?.route).toEqual(route);
    expect(result?.path).toBe(path);
  });

  it("keeps the locale apart from the path", () => {
    expect(classifyPath("/en/blog/x")?.locale).toBe("en");
  });

  it.each([
    "/",
    "/de/about",
    "/tr/admin",
    "/tr/admin/analytics",
    "/tr/auth/login",
    "/tr/profile",
    "/tr/unknown",
    "/tr/projects/a/b",
    "/tr/projects/a/docs",
    "/tr/blog/a/b",
    "/tr/projects/%E0",
    "/tr/projects/a%2Fb",
    "/tr/blog/<script>",
    "relative",
    `/tr/blog/${"a".repeat(600)}`,
  ])("ignores %s", (pathname) => {
    expect(classifyPath(pathname)).toBeNull();
  });
});

describe("isUntrackedArea", () => {
  it("covers admin, auth and profile", () => {
    expect(isUntrackedArea("/tr/admin")).toBe(true);
    expect(isUntrackedArea("/en/admin/analytics")).toBe(true);
    expect(isUntrackedArea("/tr/auth/login")).toBe(true);
    expect(isUntrackedArea("/tr/profile/likes")).toBe(true);
    expect(isUntrackedArea("/tr/administrator")).toBe(false);
    expect(isUntrackedArea("/tr/blog/admin")).toBe(false);
  });
});
