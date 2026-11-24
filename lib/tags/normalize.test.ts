import { describe, expect, it } from "vitest";
import { buildTagIndex, canonicalize, displayNameFromTopic, resolveTag } from "./normalize";

describe("canonicalize", () => {
  it.each([
    ["React", "react"],
    ["  REACT ", "react"],
    ["c++", "cpp"],
    ["C++", "cpp"],
    ["c#", "csharp"],
    ["C#", "csharp"],
    ["f#", "fsharp"],
    [".NET", "dotnet"],
    ["Node.js", "nodejs"],
    ["next.js", "nextjs"],
    ["Vue.js", "vuejs"],
    ["ASP.NET", "aspnet"],
    ["Machine Learning", "machine-learning"],
    ["machine_learning", "machine-learning"],
    ["machine--learning", "machine-learning"],
    ["-edge-", "edge"],
    ["Makine Öğrenmesi", "makine-ogrenmesi"],
    ["Gömülü Yazılım", "gomulu-yazilim"],
    ["İŞLETİM SİSTEMİ", "isletim-sistemi"],
    ["Çağrı Şüphe", "cagri-suphe"],
    ["café", "cafe"],
    ["ｒｅａｃｔ", "react"], // full-width (NFKC)
    ["objective-c++", "objective-cpp"],
    ["q#", "qsharp"],
    ["socket.io", "socket-io"],
    ["Jupyter Notebook", "jupyter-notebook"],
  ])("%j -> %j", (input, expected) => {
    expect(canonicalize(input)).toBe(expected);
  });

  it("keeps c, c++ and c# apart", () => {
    expect(new Set([canonicalize("c"), canonicalize("c++"), canonicalize("c#")]).size).toBe(3);
  });

  it("returns null when nothing is left", () => {
    expect(canonicalize("")).toBeNull();
    expect(canonicalize("  ")).toBeNull();
    expect(canonicalize("---")).toBeNull();
    expect(canonicalize("!!")).toBeNull();
  });
});

describe("resolveTag", () => {
  const react = { id: "1", slug: "react", aliases: ["reactjs"] };
  const cpp = { id: "2", slug: "cpp", aliases: ["cplusplus"] };
  const c = { id: "3", slug: "c", aliases: [] };
  const index = buildTagIndex([react, cpp, c]);

  it("matches by slug in any spelling", () => {
    for (const input of ["React", "react", "REACT"]) expect(resolveTag(index, input)).toBe(react);
  });

  it("matches by alias", () => {
    expect(resolveTag(index, "ReactJS")).toBe(react);
    expect(resolveTag(index, "cplusplus")).toBe(cpp);
    expect(resolveTag(index, "C++")).toBe(cpp);
  });

  it("does not confuse c and c++", () => {
    expect(resolveTag(index, "c")).toBe(c);
    expect(resolveTag(index, "C")).toBe(c);
  });

  it("returns null for unknown or empty input", () => {
    expect(resolveTag(index, "rust")).toBeNull();
    expect(resolveTag(index, "--")).toBeNull();
  });

  it("prefers a slug over another tag's alias, and the first tag for a shared alias", () => {
    const a = { id: "a", slug: "a", aliases: ["shared", "b"] };
    const b = { id: "b", slug: "b", aliases: ["shared"] };
    const idx = buildTagIndex([a, b]);
    expect(resolveTag(idx, "b")).toBe(b);
    expect(resolveTag(idx, "shared")).toBe(a);
  });
});

describe("displayNameFromTopic", () => {
  it.each([
    ["machine-learning", "Machine Learning"],
    ["rest-api", "Rest API"],
    ["llm", "LLM"],
    ["game_dev", "Game Dev"],
    ["  ", ""],
  ])("%j -> %j", (input, expected) => {
    expect(displayNameFromTopic(input)).toBe(expected);
  });
});
