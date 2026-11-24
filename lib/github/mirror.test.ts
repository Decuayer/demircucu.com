// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_EDGE, RepoMirror, download, isPdf, prepareImage, sha256 } from "./mirror";

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();

const bytesResponse = (
  bytes: Uint8Array,
  headers: Record<string, string> = {},
  url = "https://raw.githubusercontent.com/o/r/main/a.png",
) => {
  const response = new Response(Buffer.from(bytes), { status: 200, headers });
  Object.defineProperty(response, "url", { value: url });
  return response;
};

describe("download", () => {
  it("refuses non-https URLs and redirects", async () => {
    expect(await download("http://x/a.png", 10)).toEqual({ ok: false, reason: "insecure" });
    const fetchHttp = vi.fn(async () => bytesResponse(new Uint8Array([1]), {}, "http://x/a.png"));
    expect(await download("https://x/a.png", 10, fetchHttp)).toEqual({
      ok: false,
      reason: "insecure",
    });
  });

  it("enforces the byte cap from Content-Length and while streaming", async () => {
    const declared = vi.fn(async () =>
      bytesResponse(new Uint8Array(5), { "content-length": "999" }),
    );
    expect(await download("https://x/a", 100, declared)).toEqual({ ok: false, reason: "tooLarge" });
    const streamed = vi.fn(async () => bytesResponse(new Uint8Array(200)));
    expect(await download("https://x/a", 100, streamed)).toEqual({ ok: false, reason: "tooLarge" });
  });

  it("reports HTTP and network errors", async () => {
    expect(
      await download(
        "https://x/a",
        10,
        vi.fn(async () => new Response("", { status: 404 })),
      ),
    ).toEqual({
      ok: false,
      reason: "httpError",
    });
    const failing = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await download("https://x/a", 10, failing)).toEqual({ ok: false, reason: "network" });
  });
});

describe("prepareImage", () => {
  it("keeps size and computes a blur placeholder", async () => {
    const result = await prepareImage(await png(40, 20), "image/png");
    expect(result).toMatchObject({
      ok: true,
      image: { mime: "image/png", ext: "png", width: 40, height: 20 },
    });
    if (result.ok) expect(result.image.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("scales down oversized images", async () => {
    const result = await prepareImage(await png(MAX_IMAGE_EDGE * 2, 100), null);
    expect(result).toMatchObject({ ok: true, image: { width: MAX_IMAGE_EDGE, height: 50 } });
  });

  it("rasterises SVG to PNG at half the 2x size", async () => {
    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>',
    );
    const result = await prepareImage(svg, "text/plain");
    expect(result).toMatchObject({
      ok: true,
      image: { mime: "image/png", width: 100, height: 50 },
    });
  });

  it("keeps animated GIFs byte for byte", async () => {
    const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } })
      .gif()
      .toBuffer();
    const result = await prepareImage(gif, "image/gif");
    expect(result.ok && result.image.bytes.equals(gif)).toBe(true);
  });

  it("rejects other types", async () => {
    expect(await prepareImage(Buffer.from("%PDF-1.7 ..."), "image/png")).toEqual({
      ok: false,
      reason: "unsupportedType",
    });
    expect(await prepareImage(Buffer.from("<html><script>x</script></html>"), "text/html")).toEqual(
      {
        ok: false,
        reason: "unsupportedType",
      },
    );
  });
});

describe("RepoMirror", () => {
  function setup(responses: Record<string, Uint8Array>) {
    const rows: {
      id: string;
      path: string;
      contentHash: string;
      width: number | null;
      height: number | null;
    }[] = [];
    const db = {
      mediaFile: {
        findUnique: vi.fn(async ({ where }: { where: { contentHash: string } }) => {
          const row = rows.find((r) => r.contentHash === where.contentHash);
          return row ? { id: row.id, path: row.path, width: row.width, height: row.height } : null;
        }),
        create: vi.fn(
          async ({
            data,
          }: {
            data: {
              path: string;
              contentHash: string;
              width: number | null;
              height: number | null;
            };
          }) => {
            const row = { id: `m${rows.length + 1}`, ...data };
            rows.push(row);
            return { id: row.id, path: row.path, width: row.width, height: row.height };
          },
        ),
        findFirstOrThrow: vi.fn(),
      },
    };
    const puts: string[] = [];
    const store = { put: vi.fn(async (path: string) => void puts.push(path)) };
    const doFetch = vi.fn(async (url: string) =>
      responses[url] ? bytesResponse(responses[url], {}, url) : new Response("", { status: 404 }),
    );
    const mirror = new RepoMirror(db as never, store, "Decuayer/aegis-dispatch", doFetch);
    return { mirror, rows, puts };
  }

  it("uploads once per content and reuses identical files", async () => {
    const image = await png(10, 10);
    const { mirror, rows, puts } = setup({ "https://h/a.png": image, "https://h/copy.png": image });
    const first = await mirror.image("https://h/a.png");
    const second = await mirror.image("https://h/copy.png");
    expect(first).toEqual(second);
    expect(rows).toHaveLength(1);
    expect(puts).toEqual([`github/aegis-dispatch/${sha256(image)}.png`]);
    expect(mirror.stats).toEqual({ downloaded: 2, reused: 1, uploaded: 1, skipped: 0 });
  });

  it("skips missing files and non-PDF documents", async () => {
    const { mirror, rows } = setup({ "https://h/fake.pdf": Buffer.from("<html>") });
    expect(await mirror.image("https://h/missing.png")).toEqual({
      ok: false,
      reason: "downloadFailed",
    });
    expect(await mirror.document("https://h/fake.pdf", "fake.pdf")).toEqual({
      ok: false,
      reason: "unsupportedType",
    });
    expect(rows).toHaveLength(0);
  });

  it("stores PDFs unchanged", async () => {
    const pdf = Buffer.from("%PDF-1.7\n%%EOF");
    expect(isPdf(pdf)).toBe(true);
    const { mirror, puts } = setup({ "https://h/r.pdf": pdf });
    expect(await mirror.document("https://h/r.pdf", "r.pdf")).toMatchObject({ ok: true });
    expect(puts[0]).toMatch(/^github\/aegis-dispatch\/[0-9a-f]{64}\.pdf$/);
  });
});
