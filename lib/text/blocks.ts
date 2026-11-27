/**
 * Plain text with simple lists (experience summaries): lines starting with "-", "*" or "•" are list
 * items, other lines are paragraphs, blank lines separate paragraphs. Nothing is parsed as HTML, so
 * the text renders through React escaping only.
 */

export type TextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const BULLET = /^\s*[-*•]\s+/;

export function parseTextBlocks(text: string | null | undefined): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (BULLET.test(line)) {
      flush();
      const item = line.replace(BULLET, "").trim();
      const last = blocks.at(-1);
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** One line for meta descriptions and cards: paragraphs and items joined, markers dropped. */
export function textBlocksToPlain(text: string | null | undefined): string {
  return parseTextBlocks(text)
    .flatMap((block) => (block.type === "list" ? block.items : [block.text]))
    .map((part) => part.replace(/[.;:,]$/, ""))
    .join(" · ");
}
