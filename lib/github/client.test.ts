import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  anonymousAuth,
  appAuth,
  authFromEnv,
  createAppJwt,
  normalizePrivateKey,
  tokenAuth,
} from "./auth";
import { GithubClient, GithubHttpError, RateLimitError, nextPageUrl } from "./client";
import { repoFixture } from "./test-fixtures";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function fakeFetch(handler: Handler) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return handler(url, init);
  });
  return { fn, calls };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });

const noSleep = async () => {};

describe("nextPageUrl", () => {
  it("finds rel=next", () => {
    expect(
      nextPageUrl(
        '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=3>; rel="last"',
      ),
    ).toBe("https://api.github.com/x?page=2");
    expect(nextPageUrl('<https://api.github.com/x?page=1>; rel="prev"')).toBeNull();
    expect(nextPageUrl(null)).toBeNull();
  });
});

describe("GithubClient", () => {
  it("follows pagination and sends version and auth headers", async () => {
    const { fn, calls } = fakeFetch((url) =>
      url.includes("page=2")
        ? json([repoFixture({ id: 2, name: "b" })])
        : json([repoFixture({ id: 1 })], {
            headers: { link: '<https://api.github.com/users/Decuayer/repos?page=2>; rel="next"' },
          }),
    );
    const client = new GithubClient({ auth: tokenAuth("t0k"), fetch: fn, sleep: noSleep });
    const repos = await client.listOwnerRepos("Decuayer");
    expect(repos.map((r) => r.id)).toEqual([1, 2]);
    expect(calls[0]!.url).toBe(
      "https://api.github.com/users/Decuayer/repos?per_page=100&type=owner&sort=pushed",
    );
    expect(calls[0]!.headers).toMatchObject({
      Authorization: "Bearer t0k",
      "X-GitHub-Api-Version": "2022-11-28",
    });
    expect(client.requests).toBe(2);
  });

  it("sends If-None-Match and reports 304 as notModified", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 304 }));
    const client = new GithubClient({ auth: anonymousAuth, fetch: fn, sleep: noSleep });
    expect(await client.getReadme("o", "r", '"etag-1"')).toEqual({ status: "notModified" });
    expect(calls[0]!.headers["If-None-Match"]).toBe('"etag-1"');
    expect(calls[0]!.headers.Authorization).toBeUndefined();
  });

  it("decodes the README and keeps its ETag", async () => {
    const { fn } = fakeFetch(() =>
      json(
        {
          path: "docs/README.md",
          sha: "abc",
          encoding: "base64",
          content: Buffer.from("# Hi ✓").toString("base64"),
        },
        { headers: { etag: '"e2"' } },
      ),
    );
    const client = new GithubClient({ auth: anonymousAuth, fetch: fn });
    expect(await client.getReadme("o", "r")).toEqual({
      status: "ok",
      etag: '"e2"',
      data: { path: "docs/README.md", sha: "abc", markdown: "# Hi ✓", etag: '"e2"' },
    });
  });

  it("returns notFound for 404 and throws for other errors", async () => {
    const client404 = new GithubClient({
      auth: anonymousAuth,
      fetch: fakeFetch(() => new Response("", { status: 404 })).fn,
    });
    expect(await client404.getLanguages("o", "r")).toEqual({ status: "notFound" });
    expect(await client404.getRepo("o", "r")).toBeNull();
    const client422 = new GithubClient({
      auth: anonymousAuth,
      fetch: fakeFetch(() => new Response("", { status: 422 })).fn,
    });
    await expect(client422.getTree("o", "r", "main")).rejects.toBeInstanceOf(GithubHttpError);
  });

  it("retries 5xx and network errors with backoff", async () => {
    let n = 0;
    const sleeps: number[] = [];
    const { fn } = fakeFetch(() => {
      n++;
      if (n === 1) throw new TypeError("fetch failed");
      if (n === 2) return new Response("", { status: 502 });
      return json({ TypeScript: 10 });
    });
    const client = new GithubClient({
      auth: anonymousAuth,
      fetch: fn,
      sleep: async (ms) => void sleeps.push(ms),
    });
    expect(await client.getLanguages("o", "r")).toMatchObject({
      status: "ok",
      data: { TypeScript: 10 },
    });
    expect(sleeps).toEqual([500, 1000]);
  });

  it("stops on an exhausted primary rate limit and tracks the remaining count", async () => {
    const { fn } = fakeFetch(
      () =>
        new Response("", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" },
        }),
    );
    const client = new GithubClient({ auth: anonymousAuth, fetch: fn, sleep: noSleep });
    const error = await client.getRepo("o", "r").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetAt?.getTime()).toBe(1_900_000_000_000);
    expect(client.rateRemaining).toBe(0);
  });

  it("waits out a short secondary limit", async () => {
    let n = 0;
    const sleeps: number[] = [];
    const { fn } = fakeFetch(() =>
      ++n === 1
        ? new Response("", {
            status: 403,
            headers: { "retry-after": "2", "x-ratelimit-remaining": "40" },
          })
        : json({}),
    );
    const client = new GithubClient({
      auth: anonymousAuth,
      fetch: fn,
      sleep: async (ms) => void sleeps.push(ms),
    });
    await client.getLanguages("o", "r");
    expect(sleeps).toEqual([2000]);
  });

  it("lists tree blobs and file info", async () => {
    const { fn } = fakeFetch((url) =>
      url.includes("/git/trees/")
        ? json({
            sha: "t1",
            truncated: false,
            tree: [
              { path: "docs", type: "tree", sha: "d" },
              { path: "docs/a.pdf", type: "blob", sha: "s", size: 10 },
            ],
          })
        : json({ type: "file", path: "x.pdf", sha: "s2", size: 5 }),
    );
    const client = new GithubClient({ auth: anonymousAuth, fetch: fn });
    expect(await client.getTree("o", "r", "main")).toEqual({
      sha: "t1",
      truncated: false,
      files: [{ path: "docs/a.pdf", sha: "s", size: 10 }],
    });
    expect(await client.getFileInfo("o", "r", "my docs/x.pdf", "main")).toEqual({
      path: "my docs/x.pdf",
      sha: "s2",
      size: 5,
    });
  });
});

describe("GitHub App auth", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

  it("signs an RS256 JWT with backdated iat and 9-minute expiry", () => {
    const jwt = createAppJwt("123", pem, 1_000_000_000_000);
    const [header, payload, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });
    expect(JSON.parse(Buffer.from(payload!, "base64url").toString())).toEqual({
      iat: 1_000_000_000 - 60,
      exp: 1_000_000_000 + 540,
      iss: "123",
    });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, signature!, "base64url")).toBe(true);
  });

  it("accepts escaped newlines and base64 PEMs", () => {
    expect(normalizePrivateKey(pem.replace(/\n/g, "\\n"))).toBe(pem.trim());
    expect(normalizePrivateKey(Buffer.from(pem).toString("base64"))).toBe(pem.trim());
    expect(() => normalizePrivateKey("nope")).toThrow();
  });

  it("finds the installation, caches the token and refreshes it near expiry", async () => {
    let now = Date.parse("2026-11-24T10:00:00Z");
    const { fn, calls } = fakeFetch((url) => {
      if (url.endsWith("/users/Decuayer/installation")) return json({ id: 99 });
      return json({
        token: `ghs_${calls.length}`,
        expires_at: new Date(now + 60 * 60_000).toISOString(),
      });
    });
    const auth = appAuth({
      appId: "1",
      privateKey: pem,
      owner: "Decuayer",
      fetch: fn,
      now: () => now,
    });
    expect(await auth.authorization()).toBe("Bearer ghs_2");
    expect(await auth.authorization()).toBe("Bearer ghs_2");
    expect(calls).toHaveLength(2);
    expect(calls[1]!.url).toBe("https://api.github.com/app/installations/99/access_tokens");
    expect(calls[1]!.headers.Authorization).toMatch(/^Bearer ey/);
    now += 56 * 60_000;
    expect(await auth.authorization()).toBe("Bearer ghs_3");
  });

  it("chooses credentials from the environment", () => {
    expect(
      authFromEnv({
        GITHUB_APP_ID: "1",
        GITHUB_APP_PRIVATE_KEY: pem,
      } as unknown as NodeJS.ProcessEnv).mode,
    ).toBe("app");
    expect(authFromEnv({ GITHUB_TOKEN: "x" } as unknown as NodeJS.ProcessEnv).mode).toBe("token");
    expect(authFromEnv({} as unknown as NodeJS.ProcessEnv).mode).toBe("anonymous");
  });
});
