import { auth, headerValues } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_USER_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";
import { RATE_LIMITS } from "@/lib/rate-limit/policies";

const { consume, bucketKey } = await import("@/lib/rate-limit");
const contact = await import("@/app/actions/contact");
const interactions = await import("@/app/actions/blog_interaction");

const policy = { name: "test", limit: 3, windowSeconds: 60 };

describe("rate limiter (Postgres)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seed(prisma);
    headerValues.ip = "203.0.113.7";
  });

  it("allows up to the limit, then denies", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await consume(policy, "1.2.3.4"));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[3]?.retryAfter).toBeGreaterThan(0);
  });

  it("is atomic under concurrency", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consume({ ...policy, limit: 4 }, "9.9.9.9")),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(4);
  });

  it("starts a new window after it expires", async () => {
    for (let i = 0; i < 3; i++) await consume(policy, "5.5.5.5");
    await prisma.rateLimitBucket.update({
      where: { key: bucketKey(policy, "5.5.5.5") },
      data: { windowStart: new Date(Date.now() - 61_000) },
    });
    expect((await consume(policy, "5.5.5.5")).allowed).toBe(true);
  });

  it("stores hashed identifiers only", async () => {
    await consume(policy, "198.51.100.23");
    const rows = await prisma.rateLimitBucket.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.key).not.toContain("198.51.100.23");
    expect(rows[0]?.key).toMatch(/^test:[0-9a-f]{64}$/);
  });

  it("limits the contact form per IP", async () => {
    const message = { name: "N", email: "n@example.test", message: "Hello there, long enough." };
    const limit = RATE_LIMITS.contactPerIp.limit;
    for (let i = 0; i < limit; i++) {
      expect(await contact.submitContactMessage(message)).toEqual({ success: true });
    }
    expect(await contact.submitContactMessage(message)).toEqual({ error: "rateLimited" });
    expect(await prisma.contactMessage.count()).toBe(limit);

    headerValues.ip = "203.0.113.99";
    expect(await contact.submitContactMessage(message)).toEqual({ success: true });
  });

  it("discards honeypot submissions silently", async () => {
    const result = await contact.submitContactMessage({
      name: "Bot",
      email: "bot@example.test",
      message: "Buy now, very long message",
      website: "https://spam.test",
    });
    expect(result).toEqual({ success: true });
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it("limits comments per user", async () => {
    auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_USER_ID } });
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });
    const limit = RATE_LIMITS.commentPerUser.limit;
    for (let i = 0; i < limit; i++) {
      expect(await interactions.addComment({ postId: post.id, content: `c${i}` })).toEqual({
        success: true,
      });
    }
    expect(await interactions.addComment({ postId: post.id, content: "again" })).toEqual({
      error: "rateLimited",
    });
  });
});
