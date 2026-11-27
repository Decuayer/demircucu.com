import { describe, expect, it } from "vitest";
import { parseTextBlocks, textBlocksToPlain } from "./blocks";

describe("parseTextBlocks", () => {
  it("turns bullet lines into one list and keeps paragraphs around it", () => {
    expect(
      parseTextBlocks(
        "Gömülü yazılım ekibi.\n\n- Şarj arayüzü\n* OCPP entegrasyonu\n• Testler\nSon not.",
      ),
    ).toEqual([
      { type: "paragraph", text: "Gömülü yazılım ekibi." },
      { type: "list", items: ["Şarj arayüzü", "OCPP entegrasyonu", "Testler"] },
      { type: "paragraph", text: "Son not." },
    ]);
  });

  it("joins wrapped lines of a paragraph and ignores blank input", () => {
    expect(parseTextBlocks("bir\niki")).toEqual([{ type: "paragraph", text: "bir iki" }]);
    expect(parseTextBlocks("  \n ")).toEqual([]);
    expect(parseTextBlocks(null)).toEqual([]);
  });

  it("does not treat a hyphen inside a word or without a space as a bullet", () => {
    expect(parseTextBlocks("-5 derece\nfull-stack")).toEqual([
      { type: "paragraph", text: "-5 derece full-stack" },
    ]);
  });

  it("keeps markup as text", () => {
    expect(parseTextBlocks("- <script>x</script>")).toEqual([
      { type: "list", items: ["<script>x</script>"] },
    ]);
  });
});

describe("textBlocksToPlain", () => {
  it("joins paragraphs and items on one line", () => {
    expect(textBlocksToPlain("Ekip.\n- Arayüz;\n- Testler")).toBe("Ekip · Arayüz · Testler");
  });
});
