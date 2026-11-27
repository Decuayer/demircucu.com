// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clampText, OG_SIZE, ogCard } from "./og";

describe("clampText", () => {
  it("cuts at a word boundary with an ellipsis", () => {
    expect(clampText("kısa", 10)).toBe("kısa");
    const cut = clampText("bir iki üç dört beş altı yedi sekiz", 20);
    expect(cut.length).toBeLessThanOrEqual(20);
    expect(cut.endsWith("…")).toBe(true);
    expect(clampText(null, 10)).toBe("");
  });
});

describe("ogCard", () => {
  it("renders a 1200×630 PNG with Turkish text using the bundled Geist fonts", async () => {
    const response = await ogCard({
      kicker: "Proje · Swift",
      title: "Tatum: Yeni Nesil Dövmeci ve Stüdyo Keşif Platformu — ğüşıöç İĞÜŞÖÇ",
      description: "Dövmecilerle sanatseverleri tek bir ekosistemde buluşturan uygulama.",
      footer: "Demir Cücü · demircucu.com",
      locale: "tr",
    });
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]); // "PNG"
    const view = new DataView(bytes.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([OG_SIZE.width, OG_SIZE.height]);
  }, 30_000);
});
