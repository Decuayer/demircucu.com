/**
 * Copies the PDF.js (legacy) worker and its data files (standard fonts, CMaps, WASM decoders) from
 * pdfjs-dist into public/pdfjs/, so the PDF viewer loads them from our own origin (CSP
 * `worker-src 'self'`, `connect-src 'self'`) in exactly the version react-pdf uses.
 * Runs before `dev` and `build`; the output is git-ignored.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// react-pdf pins its own pdfjs-dist; resolve it from there.
const reactPdf = dirname(require.resolve("react-pdf/package.json"));
const pdfjs = dirname(
  createRequire(join(reactPdf, "package.json")).resolve("pdfjs-dist/package.json"),
);
const out = join(process.cwd(), "public", "pdfjs");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// Legacy worker (polyfills most built-ins the modern build expects, see next.config.ts), with
// lib/pdf/polyfills.js in front for the ones it does not polyfill (the worker is its own realm).
const polyfills = readFileSync(join(process.cwd(), "lib", "pdf", "polyfills.js"), "utf8");
const worker = readFileSync(join(pdfjs, "legacy", "build", "pdf.worker.min.mjs"), "utf8");
writeFileSync(join(out, "pdf.worker.min.mjs"), `${polyfills}\n${worker}`);
for (const dir of ["standard_fonts", "cmaps", "wasm"]) {
  cpSync(join(pdfjs, dir), join(out, dir), { recursive: true });
}
console.log(
  `pdf.js assets copied to public/pdfjs (${require(join(pdfjs, "package.json")).version})`,
);
