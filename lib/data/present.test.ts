import { beforeEach, describe, expect, it, vi } from "vitest";
import { presentExperience, presentPost, presentProject } from "./present";

type ProjectRow = Parameters<typeof presentProject>[0];
type ExperienceRow = Parameters<typeof presentExperience>[0];
type PostRow = Parameters<typeof presentPost>[0];

const ORIGIN = "https://example.supabase.co";
const tag = (slug: string, hidden = false) => ({ tag: { id: slug, slug, name: slug, hidden } });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
});

const project = (overrides: Record<string, unknown>) =>
  ({
    slug: "my-slug",
    titleTr: "",
    titleEn: "",
    summaryTr: "",
    summaryEn: "",
    githubFullName: null,
    githubDescription: null,
    logoPath: null,
    tags: [],
    ...overrides,
  }) as unknown as ProjectRow;

describe("presentProject", () => {
  it("fills a missing locale from the other one", () => {
    const out = presentProject(project({ titleTr: "Başlık", summaryEn: "Summary" }));
    expect(out).toMatchObject({
      titleTr: "Başlık",
      titleEn: "Başlık",
      summaryTr: "Summary",
      summaryEn: "Summary",
    });
  });

  it("falls back to the repository name and description, then the slug", () => {
    const synced = presentProject(
      project({ githubFullName: "owner/repo-name", githubDescription: "From GitHub" }),
    );
    expect(synced).toMatchObject({ titleTr: "repo-name", summaryEn: "From GitHub" });
    expect(presentProject(project({}))).toMatchObject({ titleEn: "my-slug", summaryTr: "" });
  });

  it("resolves the logo path and drops hidden tags", () => {
    const out = presentProject(
      project({ logoPath: "projects/a.png", tags: [tag("cpp"), tag("secret", true)] }),
    );
    expect(out.logoUrl).toBe(`${ORIGIN}/storage/v1/object/public/media/projects/a.png`);
    expect(out.tags.map((t) => t.slug)).toEqual(["cpp"]);
  });
});

describe("presentExperience", () => {
  it("resolves the company logo, or null without one", () => {
    const row = { company: "Vestel", logoPath: "experiences/v.png", tags: [tag("qt")] };
    const out = presentExperience(row as unknown as ExperienceRow);
    expect(out.logoUrl).toBe(`${ORIGIN}/storage/v1/object/public/media/experiences/v.png`);
    expect(out.tags).toHaveLength(1);
    const bare = { company: "X", logoPath: null, tags: [] };
    expect(presentExperience(bare as unknown as ExperienceRow).logoUrl).toBeNull();
  });
});

describe("presentPost", () => {
  it("resolves the cover path", () => {
    const row = { coverPath: "posts/c.webp", tags: [tag("ai", true)] };
    const out = presentPost(row as unknown as PostRow);
    expect(out.coverUrl).toBe(`${ORIGIN}/storage/v1/object/public/media/posts/c.webp`);
    expect(out.tags).toEqual([]);
  });
});
