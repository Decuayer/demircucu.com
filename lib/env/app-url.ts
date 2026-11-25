const LOCAL_APP_URL = "http://localhost:3000";

function withHttps(host: string): string {
  return /^https?:\/\//.test(host) ? host : `https://${host}`;
}

/**
 * Absolute base URL of the running deployment. Single source for `metadataBase`, auth e-mail
 * redirects and OpenGraph images.
 *
 * 1. `NEXT_PUBLIC_APP_URL` when set (production custom domain, local development).
 * 2. Preview: the branch alias (`VERCEL_BRANCH_URL`), else the deployment URL (`VERCEL_URL`).
 * 3. Production without an explicit URL: `VERCEL_PROJECT_PRODUCTION_URL`.
 * 4. `http://localhost:3000`.
 *
 * Do not set `NEXT_PUBLIC_APP_URL` for the Preview environment, or every preview would send auth
 * e-mails that link to that fixed URL instead of the preview itself.
 */
export function getAppUrl(env: Record<string, string | undefined> = process.env): URL {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const url = new URL(explicit);
    // Vercel serves only HTTPS; an "http://" value would put insecure URLs into the sitemap,
    // canonical links and auth e-mails.
    if (env.VERCEL_ENV && url.protocol === "http:" && url.hostname !== "localhost") {
      url.protocol = "https:";
    }
    return url;
  }

  if (env.VERCEL_ENV === "preview") {
    const host = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
    if (host) return new URL(withHttps(host));
  }

  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(withHttps(env.VERCEL_PROJECT_PRODUCTION_URL));
  }

  if (env.VERCEL_URL) return new URL(withHttps(env.VERCEL_URL));

  return new URL(LOCAL_APP_URL);
}

/** Absolute URL for an app path, e.g. `absoluteUrl("/tr/auth/callback")`. */
export function absoluteUrl(path: string, env?: Record<string, string | undefined>): string {
  return new URL(path, getAppUrl(env)).toString();
}
