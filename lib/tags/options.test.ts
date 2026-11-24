import { describe, expect, it } from "vitest";
import { hasExactTag, searchTagOptions, tagPath, type TagOption } from "./options";

const option = (slug: string, name: string, over: Partial<TagOption> = {}): TagOption => ({
  id: slug,
  slug,
  name,
  nameTr: null,
  nameEn: null,
  kind: "TOPIC",
  parentId: null,
  isSkill: true,
  hidden: false,
  aliases: [],
  ...over,
});

const options = [
  option("web", "Web"),
  option("react", "React", { parentId: "web", aliases: ["reactjs"] }),
  option("react-native", "React Native"),
  option("cpp", "C++", { aliases: ["cplusplus"] }),
  option("machine-learning", "Machine Learning", { nameTr: "Makine Öğrenmesi" }),
  option("preact", "Preact"),
];

describe("searchTagOptions", () => {
  it("ranks exact, then prefix, then substring matches", () => {
    expect(searchTagOptions(options, "react").map((o) => o.slug)).toEqual([
      "react",
      "react-native",
      "preact",
    ]);
  });

  it("finds tags by alias, special spelling and Turkish name", () => {
    expect(searchTagOptions(options, "C++")[0]?.slug).toBe("cpp");
    expect(searchTagOptions(options, "cplusplus")[0]?.slug).toBe("cpp");
    expect(searchTagOptions(options, "makine öğ")[0]?.slug).toBe("machine-learning");
  });

  it("returns the first options for an empty query and respects the limit", () => {
    expect(searchTagOptions(options, " ", 2)).toHaveLength(2);
    expect(searchTagOptions(options, "zzz")).toEqual([]);
  });
});

describe("hasExactTag / tagPath", () => {
  it("detects exact slug or alias matches", () => {
    expect(hasExactTag(options, "ReactJS")).toBe(true);
    expect(hasExactTag(options, "reac")).toBe(false);
    expect(hasExactTag(options, "!!")).toBe(false);
  });

  it("builds the ancestor path", () => {
    expect(tagPath(options, "react")).toBe("Web › React");
    expect(tagPath(options, "missing")).toBe("");
  });
});
