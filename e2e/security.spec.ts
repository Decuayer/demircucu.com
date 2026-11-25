import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test("public pages send the security headers", async ({ request }) => {
  const response = await request.get("/tr");
  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("unsafe-eval");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

test("server-rendered script integrity hashes match the served files", async ({ request }) => {
  const html = await (await request.get("/tr")).text();
  const tags = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"[^>]*>/g)];
  const withIntegrity = tags
    .map((m) => ({ src: m[1]!, integrity: /integrity="([^"]+)"/.exec(m[0])?.[1] }))
    .filter((t): t is { src: string; integrity: string } => !!t.integrity);
  // Experimental SRI in Next 16.4 leaves a few chunks without the attribute (security review S10).
  expect(withIntegrity.length).toBeGreaterThan(0);
  for (const { src, integrity } of withIntegrity) {
    const body = await (await request.get(src)).body();
    const digest = createHash("sha256").update(body).digest("base64");
    expect(integrity).toBe(`sha256-${digest}`);
  }
});

test("pages raise no CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  for (const path of ["/tr", "/en/blog", "/tr/blog/hello-world", "/en/auth/login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});

test.describe("upload endpoint", () => {
  test("rejects cross-origin requests", async ({ request }) => {
    const res = await request.post("/api/upload", {
      headers: { origin: "https://evil.test" },
      multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects anonymous same-origin requests", async ({ request, baseURL }) => {
    const res = await request.post("/api/upload", {
      headers: { origin: new URL(baseURL!).origin },
      multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  test("signs upload URLs only for admins on the same origin", async ({ request, baseURL }) => {
    const data = { size: 10, type: "image/png" };
    const crossOrigin = await request.post("/api/upload/sign", {
      headers: { origin: "https://evil.test" },
      data,
    });
    expect(crossOrigin.status()).toBe(403);
    const anonymous = await request.post("/api/upload/sign", {
      headers: { origin: new URL(baseURL!).origin },
      data,
    });
    expect(anonymous.status()).toBe(401);
  });
});
