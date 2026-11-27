import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Open Graph / Twitter card (1200×630): a dark card with the single violet accent (decision 3a),
 * rendered with Geist from assets/fonts (decision 4a: no network access at build or request).
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")),
]);

const COLORS = {
  background: "#09090b",
  card: "#18181b",
  border: "#3f3f46",
  text: "#fafafa",
  muted: "#a1a1aa",
  accent: "#a684ff",
  bar: "#7f22fe",
};

/** Cut text at a word boundary so it fits the card (satori has no line clamp). */
export function clampText(text: string | null | undefined, max: number): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export interface OgCardInput {
  /** Small label above the title, e.g. "Proje" / "Blog". */
  kicker: string;
  title: string;
  description?: string | null;
  /** Bottom line, e.g. "Demir Cücü · demircucu.com". */
  footer: string;
  /** Page language: upper-casing differs (Turkish i → İ, English i → I). */
  locale: string;
}

export async function ogCard({ kicker, title, description, footer, locale }: OgCardInput) {
  const [regular, bold] = await fonts;
  const heading = clampText(title, 90);
  const titleSize = heading.length > 60 ? 56 : heading.length > 34 ? 66 : 76;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLORS.background,
        padding: 48,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: COLORS.card,
          border: `2px solid ${COLORS.border}`,
          borderRadius: 28,
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 8, borderRadius: 4, background: COLORS.bar }} />
            <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.accent, letterSpacing: 1 }}>
              {kicker.toLocaleUpperCase(locale)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {heading}
          </div>
          {description ? (
            <div style={{ display: "flex", fontSize: 30, color: COLORS.muted, lineHeight: 1.4 }}>
              {clampText(description, 140)}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: COLORS.muted }}>{footer}</div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
