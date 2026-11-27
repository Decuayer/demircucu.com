import { describe, expect, it } from "vitest";
import {
  buildSkillForest,
  flattenForest,
  subtreeIds,
  subtreeSlugMap,
  topSkills,
  type TreeTag,
} from "./tree";

let n = 0;
const tag = (slug: string, over: Partial<TreeTag> = {}): TreeTag => ({
  id: slug,
  slug,
  name: slug.toUpperCase(),
  nameTr: null,
  nameEn: null,
  kind: "TOPIC",
  parentId: null,
  isSkill: true,
  hidden: false,
  icon: null,
  order: n++,
  ...over,
});

const tags = [
  tag("web", { kind: "DOMAIN" }),
  tag("frontend", { kind: "DOMAIN", parentId: "web" }),
  tag("react", { parentId: "frontend" }),
  tag("nextjs", { parentId: "react" }),
  tag("ai", { kind: "DOMAIN" }),
  tag("ml", { parentId: "ai", hidden: true }),
  tag("pytorch", { parentId: "ml" }),
  tag("empty", { kind: "DOMAIN" }),
  tag("website", { isSkill: false }),
  tag("rust"),
];

describe("buildSkillForest", () => {
  const forest = buildSkillForest(tags, [
    { tagId: "nextjs", type: "project", entityId: "p1" },
    { tagId: "react", type: "project", entityId: "p1" },
    { tagId: "react", type: "experience", entityId: "e1" },
    { tagId: "pytorch", type: "post", entityId: "b1" },
    { tagId: "website", type: "project", entityId: "p1" },
  ]);

  it("splits categories and uncategorized skills and drops empty categories and non-skills", () => {
    expect(forest.categories.map((c) => c.slug)).toEqual(["web", "ai"]);
    expect(forest.uncategorized.map((c) => c.slug)).toEqual(["rust"]);
  });

  it("counts each content item once per subtree", () => {
    const web = forest.categories[0]!;
    expect(web.counts).toEqual({ projects: 1, experiences: 1, posts: 0 });
    const react = web.children[0]!.children[0]!;
    expect(react.slug).toBe("react");
    expect(react.children.map((c) => c.slug)).toEqual(["nextjs"]);
    expect(react.children[0]!.counts).toEqual({ projects: 1, experiences: 0, posts: 0 });
  });

  it("moves children of a hidden tag up to the nearest shown ancestor", () => {
    const ai = forest.categories[1]!;
    expect(ai.children.map((c) => c.slug)).toEqual(["pytorch"]);
    expect(ai.counts.posts).toBe(1);
  });

  it("flattens depth first", () => {
    expect(flattenForest(forest).map((x) => x.slug)).toEqual([
      "web",
      "frontend",
      "react",
      "nextjs",
      "ai",
      "pytorch",
      "rust",
    ]);
  });

  it("treats a dangling parent as a root", () => {
    const f = buildSkillForest([tag("orphan", { parentId: "missing" })], []);
    expect(f.uncategorized.map((x) => x.slug)).toEqual(["orphan"]);
  });

  it("keeps a category that has content of its own", () => {
    const f = buildSkillForest(
      [tag("solo", { kind: "DOMAIN" })],
      [{ tagId: "solo", type: "experience", entityId: "e" }],
    );
    expect(f.categories.map((x) => x.slug)).toEqual(["solo"]);
  });
});

describe("subtrees", () => {
  it("collects the tag and its visible descendants", () => {
    expect(subtreeIds(tags, "web").sort()).toEqual(["frontend", "nextjs", "react", "web"]);
    expect(subtreeIds(tags, "ai")).toEqual(["ai"]); // ml is hidden, so pytorch is cut off
  });

  it("maps slugs for list filters, skipping hidden tags", () => {
    const map = subtreeSlugMap(tags);
    expect(map.react?.sort()).toEqual(["nextjs", "react"]);
    expect(map.ml).toBeUndefined();
  });
});

describe("topSkills", () => {
  it("ranks shown skills by distinct content and skips category roots and unused skills", () => {
    const graph = [
      tag("cat", { id: "cat", kind: "DOMAIN" }),
      tag("typescript", { id: "ts", parentId: "cat" }),
      tag("python", { id: "py" }),
      tag("go", { id: "go" }),
    ];
    const links = [
      { tagId: "ts", type: "project" as const, entityId: "p1" },
      { tagId: "ts", type: "post" as const, entityId: "b1" },
      { tagId: "py", type: "project" as const, entityId: "p2" },
    ];
    const forest = buildSkillForest(graph, links);
    expect(topSkills(forest, 12).map((node) => node.slug)).toEqual(["typescript", "python"]);
    expect(topSkills(forest, 1)).toHaveLength(1);
  });
});
