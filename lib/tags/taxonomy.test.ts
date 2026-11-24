import { describe, expect, it } from "vitest";
import { canonicalize } from "./normalize";
import { TAXONOMY, taxonomyNode, taxonomyOrder } from "./taxonomy";
import { TAG_KINDS } from "./kinds";

describe("starting taxonomy", () => {
  it("has unique slugs and aliases, none of which shadows another node's slug", () => {
    const keys = new Map<string, string>();
    for (const node of TAXONOMY) {
      for (const key of [node.slug, ...(node.aliases ?? [])]) {
        expect(keys.get(key), `${key} on ${node.slug}`).toBeUndefined();
        keys.set(key, node.slug);
      }
    }
  });

  it("stores slugs and aliases in canonical form", () => {
    for (const node of TAXONOMY) {
      for (const key of [node.slug, ...(node.aliases ?? [])]) expect(canonicalize(key)).toBe(key);
    }
  });

  it("defines every parent before its children (so the tree is acyclic)", () => {
    const seen = new Set<string>();
    for (const node of TAXONOMY) {
      if (node.parent) expect(seen.has(node.parent), `${node.slug} -> ${node.parent}`).toBe(true);
      seen.add(node.slug);
    }
  });

  it("uses known kinds, DOMAIN for categories, and marks project types as non-skills", () => {
    for (const node of TAXONOMY) {
      expect(TAG_KINDS).toContain(node.kind);
      if (!node.parent && node.isSkill !== false) expect(node.kind).toBe("DOMAIN");
    }
    for (const slug of ["website", "desktop-app", "flyrank", "vestel", "enterprise"]) {
      expect(taxonomyNode(slug)?.isSkill).toBe(false);
    }
  });

  it("resolves the known GitHub misspellings through aliases", () => {
    expect(taxonomyNode("embeded-systems")?.slug).toBe("embedded-systems");
    expect(taxonomyNode("genereative-ai")?.slug).toBe("generative-ai");
    expect(taxonomyNode("cplusplus")?.slug).toBe("cpp");
    expect(taxonomyNode("dotnet8")?.slug).toBe("dotnet");
    expect(taxonomyNode("bash-script")?.slug).toBe("bash");
    expect(taxonomyNode("jupyter-notebook")?.slug).toBe("python");
    expect(taxonomyNode("rust")).toBeUndefined();
  });

  it("orders nodes by their position", () => {
    expect(taxonomyOrder("languages")).toBe(0);
    expect(taxonomyOrder("cpp")).toBeGreaterThan(taxonomyOrder("c"));
    expect(taxonomyOrder("unknown")).toBe(0);
  });
});
