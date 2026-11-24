import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AuthorizationError } from "@/lib/auth/errors";
import { fail, ok, toActionFailure } from "./result";

describe("action results", () => {
  it("builds success and failure values", () => {
    expect(ok()).toEqual({ success: true });
    expect(ok({ id: "1" })).toEqual({ success: true, id: "1" });
    expect(fail("notFound")).toEqual({ error: "notFound" });
  });

  it("maps authorization errors to their code", () => {
    expect(toActionFailure(new AuthorizationError("forbidden"), "t")).toEqual({
      error: "forbidden",
    });
  });

  it("maps validation errors to field errors", () => {
    const parsed = z.object({ email: z.email() }).safeParse({ email: "nope" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const failure = toActionFailure(parsed.error, "t");
    expect(failure.error).toBe("invalidInput");
    expect(Object.keys(failure.fieldErrors ?? {})).toEqual(["email"]);
  });

  it("maps Prisma unique and missing-record errors", () => {
    expect(toActionFailure({ code: "P2002" }, "t").error).toBe("conflict");
    expect(toActionFailure({ code: "P2025" }, "t").error).toBe("notFound");
  });

  it("hides unexpected error details from the client", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = toActionFailure(
      new Error("connect ECONNREFUSED 10.0.0.1:5432 password=x"),
      "t",
    );
    expect(failure).toEqual({ error: "serverError" });
    expect(JSON.stringify(failure)).not.toContain("ECONNREFUSED");
    expect(log).toHaveBeenCalled();
  });
});
