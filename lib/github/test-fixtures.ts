import type { GithubRepo } from "./client";

/** A public repository as the GitHub API returns it (tests only). */
export function repoFixture(overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    id: 1,
    name: "demo",
    full_name: "Decuayer/demo",
    owner: { login: "Decuayer" },
    private: false,
    visibility: "public",
    fork: false,
    archived: false,
    disabled: false,
    description: "A demo",
    homepage: null,
    language: "TypeScript",
    topics: [],
    stargazers_count: 0,
    forks_count: 0,
    pushed_at: "2026-11-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    default_branch: "main",
    html_url: "https://github.com/Decuayer/demo",
    license: null,
    ...overrides,
  };
}
