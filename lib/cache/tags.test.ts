import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ updateTag }));

const { CacheTags, invalidate, tagsFor } = await import("./tags");

describe("tagsFor", () => {
  it.each([
    [{ entity: "settings" } as const, ["settings"]],
    [{ entity: "project", slug: "a" } as const, ["projects", "project:a"]],
    [
      { entity: "project", slug: "b", previousSlug: "a" } as const,
      ["projects", "project:b", "project:a"],
    ],
    [{ entity: "project", slug: "a", previousSlug: "a" } as const, ["projects", "project:a"]],
    [{ entity: "experience", id: "e1" } as const, ["experiences", "experience:e1"]],
    [{ entity: "post", slug: "p", previousSlug: "old" } as const, ["posts", "post:p", "post:old"]],
    [{ entity: "postInteractions", postId: "x" } as const, ["post-interactions:x"]],
    [{ entity: "contactMessage" } as const, []],
    [{ entity: "media" } as const, []],
  ])("%o -> %o", (change, tags) => {
    expect(tagsFor(change)).toEqual(tags);
  });

  it("keeps tags under Next's 256 character limit for realistic slugs", () => {
    expect(CacheTags.project("x".repeat(200)).length).toBeLessThanOrEqual(256);
  });
});

describe("invalidate", () => {
  beforeEach(() => updateTag.mockClear());

  it("expires each tag once", () => {
    const tags = invalidate({ entity: "project", slug: "a" }, { entity: "project", slug: "a" });
    expect(tags).toEqual(["projects", "project:a"]);
    expect(updateTag).toHaveBeenCalledTimes(2);
  });
});
