import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateTag, revalidateTag, afterTasks } = vi.hoisted(() => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
  afterTasks: [] as (() => Promise<void>)[],
}));
vi.mock("next/cache", () => ({ updateTag, revalidateTag }));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => afterTasks.push(task) }));

const { CacheTags, invalidate, SETTLE_MS, tagsFor } = await import("./tags");

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
  beforeEach(() => {
    updateTag.mockClear();
    revalidateTag.mockClear();
    afterTasks.length = 0;
  });

  it("expires each tag once", () => {
    const tags = invalidate({ entity: "project", slug: "a" }, { entity: "project", slug: "a" });
    expect(tags).toEqual(["projects", "project:a"]);
    expect(updateTag).toHaveBeenCalledTimes(2);
  });

  it("expires the same tags again after the settle delay, once the response is sent", async () => {
    vi.useFakeTimers();
    try {
      invalidate({ entity: "post", slug: "p" });
      expect(afterTasks).toHaveLength(1);
      expect(revalidateTag).not.toHaveBeenCalled();
      const done = afterTasks[0]!();
      await vi.advanceTimersByTimeAsync(SETTLE_MS);
      await done;
      expect(revalidateTag.mock.calls).toEqual([
        ["posts", { expire: 0 }],
        ["post:p", { expire: 0 }],
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("schedules nothing when no tag is affected", () => {
    invalidate({ entity: "media" });
    expect(updateTag).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(0);
  });
});
