import { describe, expect, it } from "vitest";
import type { GithubRepo } from "./client";
import { repoFixture } from "./test-fixtures";
import {
  desiredTagLinks,
  documentTitle,
  isDocsPdf,
  licenseLabel,
  repoKeyFromUrl,
  shouldAutoPublish,
  shouldImport,
  slugFromRepoName,
  uniqueSlug,
  type SyncPolicy,
} from "./policy";

const policy: SyncPolicy = {
  owner: "Decuayer",
  includeForks: false,
  includeArchived: false,
  autoPublishAfter: new Date("2026-11-24T00:00:00Z"),
};

describe("shouldImport", () => {
  it("imports public, owned, active repositories", () => {
    expect(shouldImport(repoFixture(), policy)).toBe(true);
  });

  it.each([
    ["private", { private: true }],
    ["internal visibility", { visibility: "internal" }],
    ["another owner", { owner: { login: "someone" } }],
    ["disabled", { disabled: true }],
    ["fork", { fork: true }],
    ["archived", { archived: true }],
  ] as const)("skips %s", (_, overrides) => {
    expect(shouldImport(repoFixture(overrides as Partial<GithubRepo>), policy)).toBe(false);
  });

  it("includes forks and archived repositories when enabled", () => {
    const open = { ...policy, includeForks: true, includeArchived: true };
    expect(shouldImport(repoFixture({ fork: true }), open)).toBe(true);
    expect(shouldImport(repoFixture({ archived: true }), open)).toBe(true);
  });
});

describe("shouldAutoPublish", () => {
  const fresh = repoFixture({ created_at: "2026-12-01T00:00:00Z" });

  it("publishes new repositories with a description and a README", () => {
    expect(shouldAutoPublish(fresh, policy, true)).toBe(true);
  });

  it("keeps the initial import, empty descriptions and README-less repos as drafts", () => {
    expect(shouldAutoPublish(repoFixture(), policy, true)).toBe(false);
    expect(shouldAutoPublish({ ...fresh, description: "  " }, policy, true)).toBe(false);
    expect(shouldAutoPublish({ ...fresh, description: null }, policy, true)).toBe(false);
    expect(shouldAutoPublish(fresh, policy, false)).toBe(false);
  });
});

describe("slugs", () => {
  it.each([
    ["Game-Catalog", "game-catalog"],
    ["demircucu.com", "demircucu-com"],
    ["CE475-Machine-Learning-Term-Project", "ce475-machine-learning-term-project"],
    ["__x__", "x"],
    ["---", "project"],
  ])("%s -> %s", (name, slug) => {
    expect(slugFromRepoName(name)).toBe(slug);
  });

  it("finds the first free slug", () => {
    expect(uniqueSlug("demo", new Set())).toBe("demo");
    expect(uniqueSlug("demo", new Set(["demo", "demo-2"]))).toBe("demo-3");
  });
});

describe("repoKeyFromUrl", () => {
  it.each([
    ["https://github.com/Decuayer/NetMonitor", "decuayer/netmonitor"],
    ["http://www.github.com/Decuayer/Tatum/", "decuayer/tatum"],
    ["https://github.com/Decuayer/demo.git", "decuayer/demo"],
    ["https://github.com/Decuayer/demo/tree/main/src", "decuayer/demo"],
  ])("%s", (url, key) => {
    expect(repoKeyFromUrl(url)).toBe(key);
  });

  it.each([null, "", "not a url", "https://gitlab.com/a/b", "https://github.com/Decuayer"])(
    "rejects %s",
    (url) => {
      expect(repoKeyFromUrl(url)).toBeNull();
    },
  );
});

describe("documents and labels", () => {
  it("selects PDFs under docs/", () => {
    expect(isDocsPdf("docs/report.pdf")).toBe(true);
    expect(isDocsPdf("docs/a/b.PDF")).toBe(true);
    expect(isDocsPdf("report.pdf")).toBe(false);
    expect(isDocsPdf("src/docs/a.pdf")).toBe(false);
    expect(isDocsPdf("docs/a.png")).toBe(false);
  });

  it("derives titles", () => {
    expect(documentTitle("docs/Final_Report-v2.pdf")).toBe("Final Report v2");
  });

  it("labels licenses", () => {
    expect(licenseLabel(null)).toBeNull();
    expect(licenseLabel({ spdx_id: "MIT", name: "MIT License" })).toBe("MIT");
    expect(licenseLabel({ spdx_id: "NOASSERTION", name: "Other" })).toBe("Other");
  });

  it("gives topics precedence over languages", () => {
    expect([...desiredTagLinks(["a", "b"], ["b", "c"])]).toEqual([
      ["a", "GITHUB"],
      ["b", "GITHUB"],
      ["c", "LANGUAGE"],
    ]);
  });
});
