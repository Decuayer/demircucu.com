/**
 * Minimal GitHub REST client for the sync (API version 2022-11-28).
 *
 * - Conditional requests: `If-None-Match` with a stored ETag; a 304 costs no rate limit.
 * - Pagination through the `Link` header.
 * - Retries with exponential backoff on network errors and 5xx; waits out a short secondary
 *   rate limit (`Retry-After`); stops with RateLimitError when the primary limit is used up.
 */
import { z } from "zod";
import {
  GITHUB_API,
  GITHUB_API_VERSION,
  USER_AGENT,
  type FetchLike,
  type GithubAuth,
} from "./auth";

export class RateLimitError extends Error {
  constructor(readonly resetAt: Date | null) {
    super(`GitHub rate limit exhausted${resetAt ? ` until ${resetAt.toISOString()}` : ""}`);
  }
}

export class GithubHttpError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`GitHub ${path} -> ${status}`);
  }
}

export const repoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({ login: z.string() }),
  private: z.boolean(),
  visibility: z.string().optional(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean().optional().default(false),
  description: z.string().nullable(),
  homepage: z.string().nullable().optional().default(null),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional().default([]),
  stargazers_count: z.number().int(),
  forks_count: z.number().int(),
  pushed_at: z.string().nullable(),
  created_at: z.string(),
  default_branch: z.string(),
  html_url: z.string(),
  license: z
    .object({ spdx_id: z.string().nullable(), name: z.string() })
    .nullable()
    .optional()
    .default(null),
});

export type GithubRepo = z.infer<typeof repoSchema>;

const readmeSchema = z.object({
  path: z.string(),
  sha: z.string(),
  content: z.string(),
  encoding: z.string(),
  html_url: z.string().nullable().optional(),
});

const treeSchema = z.object({
  sha: z.string(),
  truncated: z.boolean(),
  tree: z.array(
    z.object({
      path: z.string(),
      type: z.string(),
      sha: z.string(),
      size: z.number().int().optional(),
    }),
  ),
});

const contentFileSchema = z.object({
  type: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number().int(),
});

export interface Readme {
  path: string;
  sha: string;
  markdown: string;
  etag: string | null;
}

export interface TreeEntry {
  path: string;
  sha: string;
  size: number;
}

export interface RepoTree {
  sha: string;
  truncated: boolean;
  files: TreeEntry[];
}

export type Conditional<T> =
  | { status: "ok"; data: T; etag: string | null }
  | { status: "notModified" }
  | { status: "notFound" };

export interface ClientOptions {
  auth: GithubAuth;
  fetch?: FetchLike;
  baseUrl?: string;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Longest secondary-limit wait honoured before giving up (ms). */
  maxRetryAfterMs?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `<https://...&page=2>; rel="next", <...>; rel="last"` -> next URL. */
export function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const match = /<([^>]+)>\s*;\s*rel="([^"]+)"/.exec(part.trim());
    if (match && match[2]!.split(/\s+/).includes("next")) return match[1]!;
  }
  return null;
}

export class GithubClient {
  readonly auth: GithubAuth;
  private readonly doFetch: FetchLike;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetryAfterMs: number;
  /** Requests sent (304s included). */
  requests = 0;
  /** Last `X-RateLimit-Remaining` seen. */
  rateRemaining: number | null = null;

  constructor(options: ClientOptions) {
    this.auth = options.auth;
    this.doFetch = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? GITHUB_API;
    this.maxRetries = options.maxRetries ?? 3;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? 60_000;
  }

  private async send(url: string, accept: string, etag?: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: accept,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": USER_AGENT,
    };
    const authorization = await this.auth.authorization();
    if (authorization) headers.Authorization = authorization;
    if (etag) headers["If-None-Match"] = etag;

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        this.requests++;
        response = await this.doFetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining !== null) this.rateRemaining = Number(remaining);

      if (response.status === 403 || response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        if (remaining === "0") {
          const reset = Number(response.headers.get("x-ratelimit-reset"));
          throw new RateLimitError(reset ? new Date(reset * 1000) : null);
        }
        if (
          retryAfter > 0 &&
          retryAfter * 1000 <= this.maxRetryAfterMs &&
          attempt < this.maxRetries
        ) {
          await this.sleep(retryAfter * 1000);
          continue;
        }
        if (response.status === 429 && attempt < this.maxRetries) {
          await this.sleep(1000 * 2 ** attempt);
          continue;
        }
      }
      if (response.status >= 500 && attempt < this.maxRetries) {
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      return response;
    }
  }

  private async conditional<T>(
    path: string,
    parse: (body: unknown) => T,
    options: { accept?: string; etag?: string | null } = {},
  ): Promise<Conditional<T>> {
    const response = await this.send(
      `${this.baseUrl}${path}`,
      options.accept ?? "application/vnd.github+json",
      options.etag,
    );
    if (response.status === 304) return { status: "notModified" };
    if (response.status === 404) return { status: "notFound" };
    if (!response.ok) throw new GithubHttpError(response.status, path);
    return { status: "ok", data: parse(await response.json()), etag: response.headers.get("etag") };
  }

  /** Public repositories owned by `owner`, all pages. */
  async listOwnerRepos(owner: string): Promise<GithubRepo[]> {
    const repos: GithubRepo[] = [];
    let url: string | null =
      `${this.baseUrl}/users/${encodeURIComponent(owner)}/repos?per_page=100&type=owner&sort=pushed`;
    while (url) {
      const response = await this.send(url, "application/vnd.github+json");
      if (!response.ok) throw new GithubHttpError(response.status, `/users/${owner}/repos`);
      repos.push(...z.array(repoSchema).parse(await response.json()));
      url = nextPageUrl(response.headers.get("link"));
    }
    return repos;
  }

  async getRepo(owner: string, repo: string): Promise<GithubRepo | null> {
    const result = await this.conditional(`/repos/${owner}/${repo}`, (b) => repoSchema.parse(b));
    return result.status === "ok" ? result.data : null;
  }

  /** The repository README (any location GitHub recognises), base64-decoded. */
  async getReadme(owner: string, repo: string, etag?: string | null): Promise<Conditional<Readme>> {
    const result = await this.conditional(
      `/repos/${owner}/${repo}/readme`,
      (b) => readmeSchema.parse(b),
      { etag },
    );
    if (result.status !== "ok") return result;
    const { path, sha, content, encoding } = result.data;
    const markdown =
      encoding === "base64" ? Buffer.from(content, "base64").toString("utf8") : content;
    return { status: "ok", etag: result.etag, data: { path, sha, markdown, etag: result.etag } };
  }

  /** `{ language: bytes }`. */
  async getLanguages(
    owner: string,
    repo: string,
    etag?: string | null,
  ): Promise<Conditional<Record<string, number>>> {
    return this.conditional(
      `/repos/${owner}/${repo}/languages`,
      (b) => z.record(z.string(), z.number()).parse(b),
      { etag },
    );
  }

  /** Files (blobs) of the branch, recursively. `truncated` means very large repositories. */
  async getTree(owner: string, repo: string, ref: string): Promise<RepoTree | null> {
    const result = await this.conditional(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      (b) => treeSchema.parse(b),
    );
    if (result.status !== "ok") return null;
    return {
      sha: result.data.sha,
      truncated: result.data.truncated,
      files: result.data.tree
        .filter((e) => e.type === "blob")
        .map((e) => ({ path: e.path, sha: e.sha, size: e.size ?? 0 })),
    };
  }

  /** One file's metadata (used when the tree was truncated). */
  async getFileInfo(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<TreeEntry | null> {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const result = await this.conditional(
      `/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
      (b) => contentFileSchema.safeParse(b),
    );
    if (result.status !== "ok" || !result.data.success || result.data.data.type !== "file")
      return null;
    const { sha, size } = result.data.data;
    return { path, sha, size };
  }
}
