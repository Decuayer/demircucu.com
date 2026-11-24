/**
 * Phase 4 tag system (task 2.5): auto-created tags, taxonomy placement, admin tools (rename,
 * alias, merge, move, delete), content link visibility, public counts and the legacy migration.
 */
import { auth } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";
import { TagResolver, mergeTags } from "@/lib/tags/service";
import { migrateTags } from "@/lib/tags/migrate";

const admin = await import("@/app/actions/admin");
const tags = await import("@/app/actions/tags");
const skills = await import("@/lib/data/skills");

const id = async (slug: string) => (await prisma.tag.findUniqueOrThrow({ where: { slug } })).id;
const slugOf = async (tagId: string | null) =>
  tagId ? (await prisma.tag.findUniqueOrThrow({ where: { id: tagId } })).slug : null;
const aliasesOf = async (slug: string) =>
  (await prisma.tagAlias.findMany({ where: { tag: { slug } } })).map((a) => a.alias).sort();
const sampleProject = () => prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });

beforeEach(async () => {
  await resetDatabase();
  await seed(prisma);
  auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
});

describe("TagResolver (sync and selector)", () => {
  it("creates a taxonomy tag with its ancestors and aliases from a misspelled topic", async () => {
    const tag = await prisma.$transaction(async (tx) =>
      (await TagResolver.load(tx)).ensure("embeded-systems"),
    );
    expect(tag?.slug).toBe("embedded-systems");
    const row = await prisma.tag.findUniqueOrThrow({ where: { slug: "embedded-systems" } });
    expect(row).toMatchObject({
      name: "Embedded Systems",
      nameTr: "Gömülü Sistemler",
      kind: "DOMAIN",
    });
    expect(await slugOf(row.parentId)).toBe("systems");
    expect(await prisma.tag.findUnique({ where: { slug: "systems" } })).toMatchObject({
      kind: "DOMAIN",
      parentId: null,
    });
    expect(await aliasesOf("embedded-systems")).toEqual(["embedded", "embeded-systems"]);
  });

  it("auto-creates an unknown topic as a visible, uncategorized skill", async () => {
    await prisma.$transaction(async (tx) => (await TagResolver.load(tx)).ensure("game-engine"));
    expect(await prisma.tag.findUnique({ where: { slug: "game-engine" } })).toMatchObject({
      name: "Game Engine",
      kind: "TOPIC",
      isSkill: true,
      hidden: false,
      parentId: null,
    });
  });

  it("links every topic to a tag, reusing existing tags and aliases (no duplicates)", async () => {
    const topics = [
      "nextjs",
      "next-js",
      "Next.js",
      "cplusplus",
      "c++",
      "website",
      "brand-new",
      "--",
    ];
    const ids = await prisma.$transaction(async (tx) =>
      (await TagResolver.load(tx)).ensureAll(topics),
    );
    expect(ids).toHaveLength(4); // nextjs, cpp, website, brand-new
    const slugs = await Promise.all(ids.map(slugOf));
    expect(slugs).toEqual(["nextjs", "cpp", "website", "brand-new"]);
    expect(await prisma.tag.findUniqueOrThrow({ where: { slug: "website" } })).toMatchObject({
      isSkill: false,
    });
    // Second run creates nothing.
    const before = await prisma.tag.count();
    await prisma.$transaction(async (tx) => (await TagResolver.load(tx)).ensureAll(topics));
    expect(await prisma.tag.count()).toBe(before);
  });

  it("skips a taxonomy alias that an admin has given to another tag", async () => {
    const python = await id("python");
    await prisma.tagAlias.create({ data: { alias: "cplusplus", tagId: python } });
    await prisma.$transaction(async (tx) => (await TagResolver.load(tx)).ensure("cpp"));
    expect(await aliasesOf("cpp")).toEqual(["c-plus-plus"]);
  });
});

describe("tag admin actions", () => {
  it("returns the existing tag instead of creating a duplicate", async () => {
    const res = await tags.createTag({ name: "Next.js" });
    expect(res).toMatchObject({ success: true, existing: true, tag: { slug: "nextjs" } });
    const viaAlias = await tags.createTag({ name: "next-js" });
    expect(viaAlias).toMatchObject({ existing: true, tag: { slug: "nextjs" } });
  });

  it("uses the taxonomy unless the admin picks a kind or parent", async () => {
    const res = await tags.createTag({ name: "React" });
    expect(res).toMatchObject({ existing: false, tag: { slug: "react", kind: "LIBRARY" } });
    expect(
      await slugOf((await prisma.tag.findUniqueOrThrow({ where: { slug: "react" } })).parentId),
    ).toBe("frontend");
    const ai = await id("ai");
    const explicit = await tags.createTag({ name: "Docker", kind: "TOOL", parentId: ai });
    expect(explicit).toMatchObject({ existing: false, tag: { slug: "docker", parentId: ai } });
  });

  it("keeps the old slug as an alias on rename and rejects slugs taken by an alias", async () => {
    const python = await id("python");
    expect(await tags.updateTag(python, { slug: "Python3", name: "Python 3" })).toEqual({
      success: true,
    });
    expect(await prisma.tag.findUnique({ where: { id: python } })).toMatchObject({
      slug: "python3",
      name: "Python 3",
    });
    expect(await aliasesOf("python3")).toEqual(["python"]);
    // Renaming back: the alias becomes the slug again.
    expect(await tags.updateTag(python, { slug: "python" })).toEqual({ success: true });
    expect(await aliasesOf("python")).toEqual(["python3"]);
    expect(await tags.updateTag(python, { slug: "next-js" })).toEqual({ error: "conflict" });
  });

  it("rejects moving a tag below its own descendant", async () => {
    const web = await id("web");
    const nextjs = await id("nextjs");
    expect(await tags.updateTag(web, { parentId: nextjs })).toEqual({ error: "tagCycle" });
    expect(await tags.updateTag(web, { parentId: web })).toEqual({ error: "tagCycle" });
    expect(await tags.updateTag(nextjs, { parentId: await id("ai") })).toEqual({ success: true });
  });

  it("adds and removes aliases; an alias cannot equal a slug", async () => {
    const python = await id("python");
    expect(await tags.addTagAlias(python, "Py")).toEqual({ success: true });
    expect(await aliasesOf("python")).toEqual(["py"]);
    expect(await tags.addTagAlias(python, "typescript")).toEqual({ error: "conflict" });
    expect(await tags.addTagAlias(python, "py")).toEqual({ error: "conflict" });
    expect(await tags.removeTagAlias("py")).toEqual({ success: true });
    expect(await aliasesOf("python")).toEqual([]);
  });

  it("reorders siblings", async () => {
    const order = async () =>
      (
        await prisma.tag.findMany({
          where: { parent: { slug: "web" } },
          orderBy: [{ order: "asc" }, { name: "asc" }],
        })
      ).map((t) => t.slug);
    const first = (await order())[0]!;
    await tags.reorderTag(await id(first), "down");
    expect((await order())[1]).toBe(first);
    expect(await tags.reorderTag(await id(first), "sideways" as "up")).toEqual({
      error: "invalidInput",
    });
  });

  it("deletes only unused tags without children", async () => {
    expect(await tags.deleteTag(await id("python"))).toEqual({ error: "tagInUse" });
    expect(await tags.deleteTag(await id("web"))).toEqual({ error: "tagInUse" });
    await prisma.tag.create({ data: { slug: "unused", name: "Unused" } });
    expect(await tags.deleteTag(await id("unused"))).toEqual({ success: true });
  });
});

describe("merge", () => {
  it("moves every link, alias and child without losing a relation", async () => {
    const project = await sampleProject();
    // The project has typescript and nextjs; merging typescript into nextjs keeps one row.
    const ts = await id("typescript");
    const nextjs = await id("nextjs");
    const experience = await prisma.experience.findFirstOrThrow();
    await prisma.experienceTag.create({ data: { experienceId: experience.id, tagId: ts } });
    await prisma.tagAlias.create({ data: { alias: "ts", tagId: ts } });
    const child = await prisma.tag.create({ data: { slug: "deno", name: "Deno", parentId: ts } });

    expect(await tags.mergeTag(ts, nextjs)).toEqual({ success: true });
    expect(await prisma.tag.findUnique({ where: { id: ts } })).toBeNull();
    expect(
      (await prisma.projectTag.findMany({ where: { projectId: project.id } })).map((r) => r.tagId),
    ).toEqual([nextjs]);
    expect(
      await prisma.experienceTag.count({ where: { experienceId: experience.id, tagId: nextjs } }),
    ).toBe(1);
    expect(await aliasesOf("nextjs")).toEqual(["next-js", "next.js", "ts", "typescript"]);
    expect((await prisma.tag.findUniqueOrThrow({ where: { id: child.id } })).parentId).toBe(nextjs);
  });

  it("merges a parent into its own descendant without creating a cycle", async () => {
    const web = await id("web");
    const nextjs = await id("nextjs");
    await prisma.$transaction((tx) => mergeTags(tx, web, nextjs));
    const ts = await prisma.tag.findUniqueOrThrow({ where: { slug: "typescript" } });
    expect(ts.parentId).toBe(nextjs);
    expect((await prisma.tag.findUniqueOrThrow({ where: { id: nextjs } })).parentId).toBeNull();
  });

  it("rejects merging a tag into itself", async () => {
    const web = await id("web");
    expect(await tags.mergeTag(web, web)).toEqual({ error: "invalidInput" });
  });
});

describe("content tags", () => {
  it("hides a GitHub tag on one row and never removes it through the form", async () => {
    const project = await sampleProject();
    const python = await id("python");
    await prisma.projectTag.create({
      data: { projectId: project.id, tagId: python, source: "GITHUB" },
    });
    const result = await admin.updateProject(project.id, {
      titleTr: "Örnek Proje",
      titleEn: "Sample Project",
      slug: "sample-project",
      summaryTr: "x",
      summaryEn: "x",
      tagIds: [],
      hiddenTagIds: [python],
    });
    expect(result).toEqual({ success: true });
    expect(
      await prisma.projectTag.findMany({
        where: { projectId: project.id },
        select: { source: true, hidden: true },
      }),
    ).toEqual([{ source: "GITHUB", hidden: true }]);
  });
});

describe("public skill data", () => {
  it("counts published content only and leaves hidden links out", async () => {
    const forest = await skills.getSkillForest();
    const web = forest.categories.find((c) => c.slug === "web")!;
    expect(web.counts).toEqual({ projects: 1, experiences: 0, posts: 0 });
    // python: the draft project does not count, the published experience does.
    const python = forest.uncategorized.find((c) => c.slug === "python")!;
    expect(python.counts).toEqual({ projects: 0, experiences: 1, posts: 0 });

    const project = await sampleProject();
    await prisma.projectTag.updateMany({
      where: { projectId: project.id },
      data: { hidden: true },
    });
    const after = await skills.getSkillForest();
    expect(after.categories.find((c) => c.slug === "web")?.counts.projects ?? 0).toBe(0);
  });

  it("lists published content of the tag and its subtree on the skill page", async () => {
    const page = await skills.getSkillPage("web");
    expect(page.kind).toBe("found");
    if (page.kind !== "found") return;
    expect(page.skill.projects.map((p) => p.slug)).toEqual(["sample-project"]);
    expect(page.skill.children.map((c) => c.slug).sort()).toEqual(["nextjs", "typescript"]);

    const python = await skills.getSkillPage("python");
    if (python.kind !== "found") throw new Error("python missing");
    expect(python.skill.projects).toEqual([]); // draft project excluded
    expect(python.skill.experiences).toHaveLength(1);
    expect(python.skill.firstUsed?.toISOString()).toBe("2025-06-16T00:00:00.000Z");
    expect(python.skill.ongoing).toBe(false);
  });

  it("redirects aliases and other spellings, and hides hidden tags", async () => {
    expect(await skills.getSkillPage("next-js")).toEqual({ kind: "redirect", slug: "nextjs" });
    expect(await skills.getSkillPage("Next.js")).toEqual({ kind: "redirect", slug: "nextjs" });
    expect(await skills.getSkillPage("unknown")).toEqual({ kind: "missing" });
    await prisma.tag.update({ where: { slug: "python" }, data: { hidden: true } });
    expect(await skills.getSkillPage("python")).toEqual({ kind: "missing" });
    expect(await skills.getSkillSlugs()).not.toContain("python");
  });

  it("builds filter data with subtrees", async () => {
    const data = await skills.getTagFilterData();
    expect(data.subtree.web?.sort()).toEqual(["nextjs", "typescript", "web"]);
    expect(data.labels.nextjs?.name).toBe("Next.js");
  });
});

describe("migrateTags (legacy tags)", () => {
  async function legacyFixture() {
    await resetDatabase();
    await seed(prisma);
    const exp = await prisma.experience.findFirstOrThrow();
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });
    // Shapes the Phase 2 selector produced: lower-case name copied to both translations.
    const legacy = async (slug: string, name: string) =>
      prisma.tag.create({ data: { slug, name, nameTr: name, nameEn: name } });
    const cpp = await legacy("c-", "c++");
    const qt = await legacy("qt", "qt");
    const qtUpper = await legacy("Qt", "Qt");
    const embedded = await legacy("embedded-c", "embedded c");
    const turkish = await legacy("g-m-l-yaz-l-m", "gömülü yazılım");
    for (const tag of [cpp, qt, qtUpper, embedded, turkish]) {
      await prisma.experienceTag.create({ data: { experienceId: exp.id, tagId: tag.id } });
    }
    await prisma.blogPostTag.create({ data: { blogPostId: post.id, tagId: qtUpper.id } });
    await prisma.siteSettings.update({
      where: { id: "main" },
      data: {
        skills: [
          { nameTr: "React", nameEn: "React", level: 90 },
          { nameTr: "Veri Yapıları", nameEn: "Data Structures", level: 80 },
          { nameTr: "Python", nameEn: "Python", level: 85 },
          { nameTr: "", nameEn: "", level: 1 },
          "garbage",
        ],
      },
    });
    return exp;
  }

  it("merges duplicates, fixes slugs, applies the taxonomy and keeps every link", async () => {
    const exp = await legacyFixture();
    const linksBefore = await prisma.experienceTag.count({ where: { experienceId: exp.id } });
    const report = await prisma.$transaction((tx) => migrateTags(tx));

    expect(report.merged).toEqual([{ from: "Qt", into: "qt" }]);
    expect(report.renamed).toEqual(
      expect.arrayContaining([
        { from: "c-", to: "cpp" },
        { from: "g-m-l-yaz-l-m", to: "gomulu-yazilim" },
      ]),
    );
    expect(await prisma.tag.findUnique({ where: { slug: "cpp" } })).toMatchObject({
      name: "C++",
      nameTr: null,
      kind: "LANGUAGE",
    });
    expect(
      await slugOf((await prisma.tag.findUniqueOrThrow({ where: { slug: "cpp" } })).parentId),
    ).toBe("languages");
    expect(await aliasesOf("cpp")).toEqual(["c-plus-plus", "cplusplus"]);
    expect(await prisma.tag.findUnique({ where: { slug: "qt" } })).toMatchObject({ name: "Qt" });
    // Not in the taxonomy: stays uncategorized, copied translations cleared.
    expect(await prisma.tag.findUnique({ where: { slug: "gomulu-yazilim" } })).toMatchObject({
      name: "gömülü yazılım",
      nameTr: null,
      nameEn: null,
      parentId: null,
    });
    // One link lost per merged duplicate on the same experience (qt + Qt), none otherwise.
    expect(await prisma.experienceTag.count({ where: { experienceId: exp.id } })).toBe(
      linksBefore - 1,
    );
    expect(await prisma.blogPostTag.count({ where: { tag: { slug: "qt" } } })).toBe(1);

    // SiteSettings.skills: React via taxonomy, Data Structures as a translated tag, Python reused.
    expect(report.createdFromSettings.sort()).toEqual(["data-structures", "react"]);
    expect(await prisma.tag.findUnique({ where: { slug: "data-structures" } })).toMatchObject({
      name: "Data Structures",
      nameTr: "Veri Yapıları",
      nameEn: "Data Structures",
      isSkill: true,
    });
    expect(report.createdAncestors).toEqual(
      expect.arrayContaining(["frontend", "languages", "systems"]),
    );
    expect(
      (await prisma.siteSettings.findUniqueOrThrow({ where: { id: "main" } })).skills,
    ).not.toBeNull();
  });

  it("is idempotent", async () => {
    await legacyFixture();
    await prisma.$transaction((tx) => migrateTags(tx));
    const snapshot = async () =>
      prisma.tag.findMany({
        select: { slug: true, name: true, nameTr: true, nameEn: true, kind: true, parentId: true },
        orderBy: { slug: "asc" },
      });
    const before = await snapshot();
    const report = await prisma.$transaction((tx) => migrateTags(tx));
    expect(report).toEqual({
      merged: [],
      renamed: [],
      curated: [],
      clearedTranslations: [],
      createdFromSettings: [],
      createdAncestors: [],
    });
    expect(await snapshot()).toEqual(before);
  });
});
