/**
 * Credentials for the GitHub REST API, in order of preference:
 *
 *   1. GitHub App (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY): installation token, 5000 req/h.
 *   2. GITHUB_TOKEN: fine-grained PAT with public read access (local runs, staging).
 *   3. Anonymous: 60 req/h; the sync logs a warning.
 *
 * No `server-only` marker: scripts use it too. Secrets never leave this module except as the
 * Authorization header sent to api.github.com.
 */
import { createSign } from "node:crypto";

export const GITHUB_API = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const USER_AGENT = "demircucu-github-sync";

export type AuthMode = "app" | "token" | "anonymous";

export interface GithubAuth {
  mode: AuthMode;
  /** Authorization header value, or null for anonymous requests. */
  authorization(): Promise<string | null>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Default owner whose repositories the site shows. */
export const DEFAULT_GITHUB_OWNER = "Decuayer";

export function githubOwner(env: NodeJS.ProcessEnv = process.env): string {
  return env.GITHUB_OWNER?.trim() || DEFAULT_GITHUB_OWNER;
}

const base64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** PEM from an env var: literal newlines, "\n" escapes, or base64 of the whole PEM. */
export function normalizePrivateKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n").trim();
  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  if (decoded.includes("-----BEGIN")) return decoded.trim();
  throw new Error("GITHUB_APP_PRIVATE_KEY is not a PEM private key");
}

/** App JWT (RS256), valid for 9 minutes; `iat` is backdated 60 s for clock drift. */
export function createAppJwt(appId: string, privateKey: string, now = Date.now()): string {
  const seconds = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: seconds - 60, exp: seconds + 540, iss: appId }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(privateKey, "base64url")}`;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Refresh margin before the installation token expires (tokens live one hour). */
const TOKEN_MARGIN_MS = 5 * 60_000;

export function appAuth(options: {
  appId: string;
  privateKey: string;
  owner: string;
  installationId?: string;
  fetch?: FetchLike;
  now?: () => number;
}): GithubAuth {
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const key = normalizePrivateKey(options.privateKey);
  let cached: CachedToken | null = null;
  let installationId = options.installationId;

  const call = async (path: string, method: "GET" | "POST") => {
    const response = await doFetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${createAppJwt(options.appId, key, now())}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub App authentication failed: ${method} ${path} -> ${response.status}`);
    }
    return (await response.json()) as Record<string, unknown>;
  };

  return {
    mode: "app",
    async authorization() {
      if (cached && cached.expiresAt - TOKEN_MARGIN_MS > now()) return `Bearer ${cached.token}`;
      if (!installationId) {
        const installation = await call(
          `/users/${encodeURIComponent(options.owner)}/installation`,
          "GET",
        );
        installationId = String(installation.id);
      }
      const body = await call(`/app/installations/${installationId}/access_tokens`, "POST");
      cached = {
        token: String(body.token),
        expiresAt: Date.parse(String(body.expires_at)) || now() + 55 * 60_000,
      };
      return `Bearer ${cached.token}`;
    },
  };
}

export function tokenAuth(token: string): GithubAuth {
  return { mode: "token", authorization: async () => `Bearer ${token}` };
}

export const anonymousAuth: GithubAuth = { mode: "anonymous", authorization: async () => null };

/** Credentials from the environment (see .env.example). */
export function authFromEnv(env: NodeJS.ProcessEnv = process.env, doFetch?: FetchLike): GithubAuth {
  const appId = env.GITHUB_APP_ID?.trim();
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;
  if (appId && privateKey) {
    return appAuth({
      appId,
      privateKey,
      owner: githubOwner(env),
      installationId: env.GITHUB_APP_INSTALLATION_ID?.trim() || undefined,
      fetch: doFetch,
    });
  }
  const token = env.GITHUB_TOKEN?.trim();
  if (token) return tokenAuth(token);
  return anonymousAuth;
}
