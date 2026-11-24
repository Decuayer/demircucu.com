import { describe, expect, it } from "vitest";
import type { Tag } from "@prisma/client";
import { flattenTags, tagLabel } from "./view";

const tag = (over: Partial<Tag>): Tag => ({
  id: "t",
  slug: "t",
  name: "Machine Learning",
  nameTr: null,
  nameEn: null,
  kind: "CONCEPT",
  parentId: null,
  isSkill: true,
  icon: null,
  descriptionTr: null,
  descriptionEn: null,
  order: 0,
  hidden: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

describe("tagLabel", () => {
  it("uses the translation for the locale and falls back to the canonical name", () => {
    const ml = tag({ nameTr: "Makine Öğrenmesi" });
    expect(tagLabel(ml, "tr")).toBe("Makine Öğrenmesi");
    expect(tagLabel(ml, "en")).toBe("Machine Learning");
    expect(tagLabel(tag({ name: "C++", nameEn: "" }), "en")).toBe("C++");
  });
});

describe("flattenTags", () => {
  it("drops globally hidden tags unless asked to keep them", () => {
    const rows = [{ tag: tag({ id: "a" }) }, { tag: tag({ id: "b", hidden: true }) }];
    expect(flattenTags(rows).map((t) => t.id)).toEqual(["a"]);
    expect(flattenTags(rows, { includeHidden: true }).map((t) => t.id)).toEqual(["a", "b"]);
  });
});
