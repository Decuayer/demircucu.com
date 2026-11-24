// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cleanDisplayName, evaluateUpload, uploadFieldsSchema, UPLOAD_TYPES } from "./policy";
import { inspectUpload } from "./inspect";

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89,
]);
const PDF = new TextEncoder().encode(
  "%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
);
const SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);
const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");

describe("evaluateUpload", () => {
  it("accepts allowlisted types within their size limit", () => {
    expect(evaluateUpload("image/png", 1000)).toMatchObject({ ok: true, ext: "png" });
    expect(evaluateUpload("application/pdf", 1000)).toMatchObject({ ok: true, ext: "pdf" });
  });

  it.each(["image/svg+xml", "text/html", "application/zip", "application/x-msdownload", undefined])(
    "rejects %s",
    (mime) => {
      expect(evaluateUpload(mime, 1000)).toEqual({ ok: false, reason: "unsupportedType" });
    },
  );

  it("applies per-type size limits", () => {
    expect(evaluateUpload("image/x-icon", UPLOAD_TYPES["image/x-icon"].maxBytes + 1)).toEqual({
      ok: false,
      reason: "tooLarge",
    });
    expect(evaluateUpload("image/png", 0)).toEqual({ ok: false, reason: "empty" });
  });
});

describe("inspectUpload (magic bytes)", () => {
  it("detects real PNG and PDF content", async () => {
    expect(await inspectUpload(PNG)).toMatchObject({ ok: true, mime: "image/png" });
    expect(await inspectUpload(PDF)).toMatchObject({ ok: true, mime: "application/pdf" });
  });

  it("rejects SVG and HTML whatever name or MIME type the client claims", async () => {
    expect(await inspectUpload(SVG)).toMatchObject({ ok: false });
    expect(await inspectUpload(HTML)).toMatchObject({ ok: false });
  });
});

describe("uploadFieldsSchema", () => {
  it("only accepts known folders", () => {
    expect(uploadFieldsSchema.safeParse({ name: "a.png", folder: "blog" }).success).toBe(true);
    expect(uploadFieldsSchema.safeParse({ name: "a.png", folder: "../auth" }).success).toBe(false);
    expect(uploadFieldsSchema.parse({ name: "a.png" }).folder).toBe("general");
  });

  it("validates usedIn references", () => {
    expect(uploadFieldsSchema.safeParse({ name: "a", usedIn: "project:clx123" }).success).toBe(
      true,
    );
    expect(uploadFieldsSchema.safeParse({ name: "a", usedIn: "x:<script>" }).success).toBe(false);
  });
});

describe("cleanDisplayName", () => {
  it("strips paths and control characters", () => {
    expect(cleanDisplayName("../../etc/passwd")).toBe("passwd");
    expect(cleanDisplayName("C:\\x\\photo<1>.png")).toBe("photo1.png");
    expect(cleanDisplayName("\u0000")).toBe("file");
  });
});
