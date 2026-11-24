import { describe, expect, it } from "vitest";
import { planLinks, type LinkableProject } from "./link";

const repo = (id: number, name: string) => ({
  id,
  name,
  full_name: `Decuayer/${name}`,
  html_url: `https://github.com/Decuayer/${name}`,
});

const project = (slug: string, overrides: Partial<LinkableProject> = {}): LinkableProject => ({
  id: slug,
  slug,
  titleTr: null,
  titleEn: null,
  githubUrl: null,
  githubRepoId: null,
  ...overrides,
});

const repos = [
  repo(1, "Game-Catalog"),
  repo(2, "NetMonitor"),
  repo(3, "Tatum"),
  repo(4, "unused"),
  repo(5, "cucu-s-portfolio"),
];

describe("planLinks", () => {
  it("matches by URL, then by name; reports leftovers", () => {
    const plan = planLinks(
      [
        project("tatum", { githubUrl: "https://github.com/decuayer/tatum/" }),
        project("game-catalog", {
          titleEn: "Game Catalog",
          githubUrl: "Prompt text pasted by mistake",
        }),
        project("net", { titleTr: "NetMonitor" }),
        project("site", { githubUrl: "https://github.com/someone/else" }),
        project("gone", { githubUrl: "https://github.com/Decuayer/deleted-repo" }),
        project("nothing"),
        project("linked", { githubRepoId: BigInt(5) }),
      ],
      repos,
      "Decuayer",
    );
    const summary = plan.matches.map((m) => [
      m.project.slug,
      m.kind,
      "repo" in m && m.repo ? m.repo.name : "reason" in m ? m.reason : null,
    ]);
    expect(summary).toEqual([
      ["tatum", "url", "Tatum"],
      ["game-catalog", "name", "Game-Catalog"],
      ["net", "name", "NetMonitor"],
      ["site", "none", "otherOwner"],
      ["gone", "none", "unknownRepo"],
      ["nothing", "none", "noUrl"],
      ["linked", "linked", "cucu-s-portfolio"],
    ]);
    expect(plan.matches[0]).toMatchObject({ urlChanges: true });
    expect(plan.unclaimed.map((r) => r.name)).toEqual(["unused"]);
  });

  it("links neither project when two claim the same repository", () => {
    const plan = planLinks(
      [project("a", { githubUrl: "https://github.com/Decuayer/Tatum" }), project("tatum")],
      repos,
      "Decuayer",
    );
    expect(plan.matches.map((m) => m.kind)).toEqual(["conflict", "conflict"]);
    expect(plan.matches[0]).toMatchObject({ others: ["tatum"] });
  });
});
