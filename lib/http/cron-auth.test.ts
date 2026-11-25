import { afterEach, describe, expect, it } from "vitest";
import { cronGate, isAuthorizedCron } from "./cron-auth";

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("isAuthorizedCron", () => {
  it("accepts only the exact bearer token", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer s3cre", "s3cret")).toBe(false);
    expect(isAuthorizedCron("Bearer s3cretX", "s3cret")).toBe(false);
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });
});

describe("cronGate", () => {
  it("refuses to run without a configured secret", async () => {
    const response = cronGate(request("Bearer anything"));
    expect(response?.status).toBe(503);
  });

  it("rejects wrong or missing tokens and lets the right one through", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(cronGate(request())?.status).toBe(401);
    expect(cronGate(request("Bearer nope"))?.status).toBe(401);
    expect(cronGate(request("Bearer s3cret"))).toBeNull();
  });
});
