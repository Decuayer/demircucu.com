import { SITE_TIME_ZONE } from "@/lib/format-date";

/**
 * Length of an experience, counted like LinkedIn (decision 1a, phase 8): calendar months with
 * both the first and the last month included, in the site's time zone, so June – July 2025 is
 * two months and a role that starts and ends in the same month is one.
 */

const monthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
});

/** Year and month (1–12) of a date in the site's time zone. */
function yearMonth(date: Date): { year: number; month: number } {
  const parts = monthFormat.formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  return { year: value("year"), month: value("month") };
}

export function calendarMonths(start: Date, end: Date): number {
  const a = yearMonth(start);
  const b = yearMonth(end);
  return Math.max(1, (b.year - a.year) * 12 + (b.month - a.month) + 1);
}

export function splitMonths(total: number): { years: number; months: number } {
  return { years: Math.floor(total / 12), months: total % 12 };
}

/** "2025-06" for a <time datetime> (month precision, site time zone). */
export function isoMonth(date: Date): string {
  const { year, month } = yearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}
