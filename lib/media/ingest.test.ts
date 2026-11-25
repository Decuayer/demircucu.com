// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { ingestUpload, type IngestStore } from "./ingest";

type Row = Record<string, unknown> & { contentHash: string; path: string };

function fakeDb(rows: Row[] = []) {
  const mediaFile = {
    findUnique: vi.fn(async ({ where }: { where: { contentHash: string } }) => {
      return rows.find((r) => r.contentHash === where.contentHash) ?? null;
    }),
    create: vi.fn(async ({ data }: { data: Row }) => {
      const row = { id: `m${rows.length + 1}`, createdAt: new Date(0), ...data };
      rows.push(row);
      return row;
    }),
  };
  return { db: { mediaFile } as never, mediaFile, rows };
}

function fakeStore() {
  const objects = new Map<string, Uint8Array>();
  const store: IngestStore & { objects: typeof objects } = {
    objects,
    put: vi.fn(async (path: string, bytes: Uint8Array) => void objects.set(path, bytes)),
    remove: vi.fn(async (path: string) => objects.delete(path)),
  };
  return store;
}

async function photoWithGps(width: number, height: number): Promise<Uint8Array> {
  return sharp({ create: { width, height, channels: 3, background: "#3366aa" } })
    .withExif({
      IFD0: { Make: "TestCam" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 0/1 0/1" },
    })
    .jpeg({ quality: 60 })
    .toBuffer();
}

describe("ingestUpload", () => {
  it("strips EXIF, caps the size and stores under a content hash", async () => {
    const { db, rows } = fakeDb();
    const store = fakeStore();
    const original = await photoWithGps(3000, 1500);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const result = await ingestUpload(
      { bytes: original, name: "photo.jpg", folder: "settings" },
      { db, store, bucket: "media" },
    );

    expect(result).toMatchObject({ ok: true, reused: false, file: { width: 2400, height: 1200 } });
    const [path] = [...store.objects.keys()];
    expect(path).toMatch(/^settings\/[0-9a-f]{64}\.jpg$/);
    const stored = await sharp(store.objects.get(path!)!).metadata();
    expect(stored.exif).toBeUndefined();
    expect(stored.width).toBe(2400);
    expect(rows[0]).toMatchObject({
      source: "UPLOAD",
      type: "image/jpeg",
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      blurDataUrl: expect.stringMatching(/^data:image\/webp;base64,/),
    });
  });

  it("removes metadata even when re-encoding would not shrink the file", async () => {
    const { db } = fakeDb();
    const store = fakeStore();
    const tiny = await photoWithGps(4, 4);
    await ingestUpload(
      { bytes: tiny, name: "t.jpg", folder: "blog" },
      { db, store, bucket: "media" },
    );
    const [bytes] = [...store.objects.values()];
    expect((await sharp(bytes!).metadata()).exif).toBeUndefined();
  });

  it("reuses the entry for identical content without storing it again", async () => {
    const { db, mediaFile } = fakeDb();
    const store = fakeStore();
    const bytes = await photoWithGps(10, 10);
    const deps = { db, store, bucket: "media" };
    const first = await ingestUpload({ bytes, name: "a.jpg", folder: "blog" }, deps);
    const second = await ingestUpload({ bytes, name: "b.jpg", folder: "projects" }, deps);
    expect(second).toMatchObject({ ok: true, reused: true });
    expect(first.ok && second.ok && second.file.path).toBe(first.ok && first.file.path);
    expect(store.put).toHaveBeenCalledTimes(1);
    expect(mediaFile.create).toHaveBeenCalledTimes(1);
  });

  it("stores PDFs unchanged without image metadata", async () => {
    const { db, rows } = fakeDb();
    const store = fakeStore();
    const pdf = new TextEncoder().encode(
      "%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
    );
    const result = await ingestUpload(
      { bytes: pdf, name: "cv.pdf", folder: "general" },
      { db, store, bucket: "media" },
    );
    expect(result).toMatchObject({ ok: true });
    expect(rows[0]).toMatchObject({ type: "application/pdf", width: null, blurDataUrl: null });
    expect([...store.objects.values()][0]).toEqual(pdf);
  });

  it("rejects content the policy does not allow, whatever the name says", async () => {
    const { db } = fakeDb();
    const store = fakeStore();
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const result = await ingestUpload(
      { bytes: html, name: "x.png", folder: "general" },
      { db, store, bucket: "media" },
    );
    expect(result).toEqual({ ok: false, reason: "unsupportedType" });
    expect(store.put).not.toHaveBeenCalled();
  });

  it("removes the stored object when the database write fails", async () => {
    const { db, mediaFile } = fakeDb();
    mediaFile.create.mockRejectedValueOnce(new Error("db down"));
    const store = fakeStore();
    const bytes = await photoWithGps(8, 8);
    await expect(
      ingestUpload({ bytes, name: "a.jpg", folder: "blog" }, { db, store, bucket: "media" }),
    ).rejects.toThrow("db down");
    expect(store.objects.size).toBe(0);
  });
});
