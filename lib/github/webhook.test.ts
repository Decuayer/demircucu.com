import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { routeWebhook, verifySignature } from "./webhook";

const sign = (secret: string, body: string) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifySignature", () => {
  const body = JSON.stringify({ zen: "Keep it logically awesome." });

  it("accepts the right signature", () => {
    expect(verifySignature("s3cret", body, sign("s3cret", body))).toBe(true);
  });

  it.each([
    ["wrong secret", sign("other", body)],
    ["missing", null],
    ["no prefix", sign("s3cret", body).slice(7)],
    ["sha1", "sha1=abc"],
    ["truncated", sign("s3cret", body).slice(0, 20)],
  ])("rejects %s", (_, header) => {
    expect(verifySignature("s3cret", body, header)).toBe(false);
  });

  it("rejects a modified body and an empty secret", () => {
    expect(verifySignature("s3cret", body + " ", sign("s3cret", body))).toBe(false);
    expect(verifySignature("", body, sign("", body))).toBe(false);
  });
});

const repository = { id: 7, full_name: "Decuayer/demo", default_branch: "main" };

describe("routeWebhook", () => {
  it("syncs a push to the default branch only", () => {
    expect(routeWebhook("push", { ref: "refs/heads/main", repository }, "Decuayer")).toEqual({
      kind: "repos",
      repos: [{ fullName: "Decuayer/demo", id: 7 }],
    });
    expect(routeWebhook("push", { ref: "refs/heads/feature", repository }, "Decuayer").kind).toBe(
      "ignore",
    );
    expect(routeWebhook("push", { ref: "refs/tags/v1", repository }, "Decuayer").kind).toBe(
      "ignore",
    );
  });

  it.each(["created", "renamed", "edited", "archived", "privatized", "deleted", "publicized"])(
    "syncs repository.%s",
    (action) => {
      expect(routeWebhook("repository", { action, repository }, "Decuayer").kind).toBe("repos");
    },
  );

  it("ignores other repository actions and other owners", () => {
    expect(routeWebhook("repository", { action: "starred", repository }, "Decuayer").kind).toBe(
      "ignore",
    );
    expect(
      routeWebhook(
        "push",
        { ref: "refs/heads/main", repository: { ...repository, full_name: "x/demo" } },
        "Decuayer",
      ),
    ).toEqual({ kind: "ignore", reason: "otherOwner" });
  });

  it("syncs repositories added to the installation", () => {
    const payload = {
      action: "added",
      repositories_added: [
        { id: 1, full_name: "Decuayer/a" },
        { id: 2, full_name: "someone/b" },
        { id: "bad", full_name: "Decuayer/c" },
      ],
    };
    expect(routeWebhook("installation_repositories", payload, "decuayer")).toEqual({
      kind: "repos",
      repos: [{ fullName: "Decuayer/a", id: 1 }],
    });
    expect(routeWebhook("installation_repositories", { action: "removed" }, "Decuayer").kind).toBe(
      "ignore",
    );
  });

  it("runs a full sync on installation, ignores unknown events", () => {
    expect(routeWebhook("installation", { action: "created" }, "Decuayer")).toEqual({
      kind: "all",
    });
    expect(routeWebhook("installation", { action: "deleted" }, "Decuayer").kind).toBe("ignore");
    expect(routeWebhook("public", { repository }, "Decuayer").kind).toBe("repos");
    expect(routeWebhook("star", { repository }, "Decuayer")).toEqual({
      kind: "ignore",
      reason: "event",
    });
    expect(routeWebhook(null, null, "Decuayer").kind).toBe("ignore");
    expect(routeWebhook("push", { ref: "refs/heads/main" }, "Decuayer").kind).toBe("ignore");
  });
});
