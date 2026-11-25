/**
 * Builds audit-screenshots/index.html from the design audit results (playwright.audit.config.ts):
 * one section per page group, the three widths side by side, and the automated findings.
 * Also prints a plain-text summary. Local only; the folder is gitignored.
 *
 *   npx tsx scripts/design-audit-gallery.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "audit-screenshots";

interface Axe {
  id: string;
  impact: string | null;
  help: string;
  nodes: number;
  targets: string[];
}
interface Width {
  width: number;
  status: number | null;
  finalUrl: string;
  screenshot: string;
  overflowX: number;
  consoleErrors: string[];
  consoleWarnings: string[];
  images: { src: string; alt: string | null; broken: boolean }[];
  headings: string[];
  axe?: Axe[];
  focus?: { element: string; visible: boolean }[];
  turkishOnEnglish?: string[];
  smallTargets?: string[];
}
interface Result {
  id: string;
  group: string;
  title: string;
  source: string;
  url: string;
  widths: Width[];
}

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const results: Result[] = readdirSync(`${OUT}/results`)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(`${OUT}/results/${file}`, "utf8")) as Result);

const GROUP_ORDER = ["Public", "Giriş / kayıt", "Profil", "Admin"];
results.sort(
  (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.id.localeCompare(b.id),
);

function findings(result: Result) {
  const items: { level: "high" | "mid" | "low"; text: string }[] = [];
  const axe = new Map<string, Axe & { widths: number[] }>();
  for (const w of result.widths) {
    for (const v of w.axe ?? []) {
      const current = axe.get(v.id);
      if (current) current.widths.push(w.width);
      else axe.set(v.id, { ...v, widths: [w.width] });
    }
  }
  for (const v of axe.values()) {
    const level = v.impact === "critical" || v.impact === "serious" ? "high" : "mid";
    items.push({
      level,
      text: `axe ${v.id} (${v.impact}, ${v.nodes} öğe, ${v.widths.join("/")}): ${v.help}${v.targets.length ? ` — ${v.targets.slice(0, 3).join(" | ")}` : ""}`,
    });
  }
  for (const w of result.widths) {
    if (w.status && w.status >= 400)
      items.push({ level: "mid", text: `${w.width}px: HTTP ${w.status}` });
    if (w.overflowX > 1) {
      items.push({ level: "high", text: `${w.width}px: yatay taşma ${w.overflowX}px` });
    }
    for (const e of new Set(w.consoleErrors)) {
      items.push({ level: "high", text: `${w.width}px konsol hatası: ${e}` });
    }
    for (const e of new Set(w.consoleWarnings)) {
      items.push({ level: "low", text: `${w.width}px konsol uyarısı: ${e}` });
    }
    for (const img of w.images.filter((i) => i.broken)) {
      items.push({ level: "high", text: `${w.width}px kırık görsel: ${img.src}` });
    }
    if (w.smallTargets?.length) {
      items.push({
        level: "low",
        text: `375px küçük dokunma hedefleri (<24px): ${w.smallTargets.slice(0, 6).join(", ")}`,
      });
    }
    const hidden = w.focus?.filter((f) => !f.visible) ?? [];
    if (hidden.length) {
      items.push({
        level: "mid",
        text: `Klavye: ${hidden.length}/${w.focus!.length} odakta görünür gösterge yok (${hidden
          .slice(0, 4)
          .map((f) => f.element)
          .join(", ")})`,
      });
    }
    if (w.turkishOnEnglish?.length) {
      items.push({
        level: "mid",
        text: `EN sayfada Türkçe metin: ${w.turkishOnEnglish.slice(0, 12).join(" · ")}`,
      });
    }
  }
  const first = result.widths[0];
  if (first) {
    const h1 = first.headings.filter((h) => h.startsWith("h1")).length;
    if (h1 !== 1) items.push({ level: "mid", text: `h1 sayısı ${h1}` });
    const noAlt = new Set(first.images.filter((i) => i.alt === null).map((i) => i.src));
    if (noAlt.size)
      items.push({ level: "mid", text: `alt özniteliği olmayan görsel: ${noAlt.size}` });
  }
  return items;
}

const all = results.map((result) => ({ result, items: findings(result) }));

const sections = GROUP_ORDER.map((group) => {
  const pages = all.filter(({ result }) => result.group === group);
  if (pages.length === 0) return "";
  return `<h2 id="${esc(group)}">${esc(group)} <small>${pages.length} sayfa</small></h2>${pages
    .map(
      ({ result, items }) => `
<section class="page" id="${esc(result.id)}">
  <header>
    <h3>${esc(result.title)}</h3>
    <a href="${esc(result.url.startsWith("http") ? result.url : `http://localhost:3100${result.url}`)}">${esc(result.url)}</a>
    <span class="src">${esc(result.source)}</span>
    <span class="count high">${items.filter((i) => i.level === "high").length}</span>
    <span class="count mid">${items.filter((i) => i.level === "mid").length}</span>
    <span class="count low">${items.filter((i) => i.level === "low").length}</span>
  </header>
  <div class="shots">${result.widths
    .map(
      (w) => `<figure><figcaption>${w.width}px · ${w.status ?? "?"}</figcaption>
      <a href="${esc(w.screenshot)}" target="_blank"><img loading="lazy" src="${esc(w.screenshot)}" alt="${esc(result.title)} ${w.width}px"></a></figure>`,
    )
    .join("")}</div>
  ${
    items.length
      ? `<details${items.some((i) => i.level === "high") ? " open" : ""}><summary>Otomatik bulgular (${items.length})</summary><ul>${items
          .map((i) => `<li class="${i.level}">${esc(i.text)}</li>`)
          .join("")}</ul></details>`
      : `<p class="ok">Otomatik kontrollerde bulgu yok.</p>`
  }
  <details><summary>Başlık yapısı (1440px)</summary><ul>${(result.widths[0]?.headings ?? [])
    .map((h) => `<li>${esc(h)}</li>`)
    .join("")}</ul></details>
</section>`,
    )
    .join("")}`;
}).join("");

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tasarım denetimi galerisi</title>
<style>
  :root { color-scheme: light dark; --bg:#fafafa; --fg:#18181b; --muted:#71717a; --card:#fff; --line:#e4e4e7; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0b0b0d; --fg:#f4f4f5; --muted:#a1a1aa; --card:#151518; --line:#27272a; } }
  body { margin:0; font:14px/1.5 system-ui, sans-serif; background:var(--bg); color:var(--fg); }
  main { max-width:1600px; margin:0 auto; padding:24px 16px 80px; }
  nav { position:sticky; top:0; background:var(--bg); padding:8px 0; border-bottom:1px solid var(--line); z-index:1; }
  nav a { margin-right:12px; color:inherit; }
  h2 small, .src { color:var(--muted); font-weight:400; font-size:12px; }
  .page { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; margin:16px 0; }
  .page header { display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; }
  .page h3 { margin:0; font-size:16px; }
  .page header a { color:var(--muted); font-size:12px; word-break:break-all; }
  .count { font-size:11px; padding:1px 7px; border-radius:99px; }
  .count.high { background:#dc262622; color:#ef4444; } .count.mid { background:#d9770622; color:#f59e0b; } .count.low { background:#71717a22; color:var(--muted); }
  .shots { display:grid; grid-template-columns: 1440fr 768fr 375fr; gap:12px; align-items:start; margin:12px 0; }
  figure { margin:0; } figcaption { font-size:12px; color:var(--muted); margin-bottom:4px; }
  .shots img { width:100%; max-height:900px; object-fit:cover; object-position:top; border:1px solid var(--line); border-radius:6px; }
  li.high { color:#ef4444; } li.mid { color:#d97706; } li.low { color:var(--muted); }
  .ok { color:#16a34a; }
  @media (max-width: 800px) { .shots { grid-template-columns:1fr; } }
</style>
</head>
<body><main>
<h1>Tasarım denetimi galerisi</h1>
<p>${results.length} sayfa × 3 genişlik. Public sayfalar production'dan, giriş/profil/admin yerel E2E build'inden (seed verisi). Görsele tıklayınca tam boy açılır. Renkli sayılar: yüksek / orta / düşük öncelikli otomatik bulgular.</p>
<nav>${GROUP_ORDER.map((g) => `<a href="#${esc(g)}">${esc(g)}</a>`).join("")}</nav>
${sections}
</main></body></html>`;

writeFileSync(`${OUT}/index.html`, html);

// Plain-text summary for the report.
const ruleCounts = new Map<string, { pages: Set<string>; impact: string | null; help: string }>();
for (const { result } of all) {
  for (const w of result.widths) {
    for (const v of w.axe ?? []) {
      const entry = ruleCounts.get(v.id) ?? { pages: new Set(), impact: v.impact, help: v.help };
      entry.pages.add(result.id);
      ruleCounts.set(v.id, entry);
    }
  }
}
console.log(`Gallery: ${OUT}/index.html (${results.length} pages)\n\naxe rules:`);
for (const [id, entry] of [...ruleCounts].sort((a, b) => b[1].pages.size - a[1].pages.size)) {
  console.log(`  ${id} [${entry.impact}] ${entry.pages.size} pages — ${entry.help}`);
}
console.log("\nPer page:");
for (const { result, items } of all) {
  const nonAxe = items.filter((i) => !i.text.startsWith("axe "));
  if (nonAxe.length === 0) continue;
  console.log(`- ${result.id}`);
  for (const item of nonAxe) console.log(`    [${item.level}] ${item.text.slice(0, 260)}`);
}
