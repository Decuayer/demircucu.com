/** Display helpers for the dashboard; locale-aware where the browser provides it. */

/** Seconds as m:ss (or h:mm:ss); "–" for null. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "–";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatNumber(value: number | null, locale: string, digits = 0): string {
  if (value === null || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

/** "+12%" / "-3%" / "0%"; null when there is no comparison. */
export function formatChange(change: number | null, locale: string): string | null {
  if (change === null) return null;
  const rounded = Math.round(change);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(locale).format(rounded)}%`;
}

/** Country name for an ISO code in the UI language; the code itself as a fallback. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "5 Kas" style short day label of a YYYY-MM-DD string (UTC). */
export function shortDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
