import { z } from "zod";

/**
 * Dashboard date ranges. Days are UTC calendar days (the same days the nightly aggregation and
 * the daily visitor salt use); `from` and `to` are inclusive YYYY-MM-DD strings.
 */
export const RANGE_PRESETS = ["today", "7d", "30d", "90d", "12m", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
  days: number;
}

export interface RangeWithPrevious extends DateRange {
  previous: { from: string; to: string };
}

/** Longest custom range; a little over the 12-month preset. */
export const MAX_RANGE_DAYS = 400;
const DAY_MS = 86_400_000;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && toDay(fromDay(value)) === value,
  );

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, amount: number): string {
  return toDay(new Date(fromDay(day).getTime() + amount * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromDay(to).getTime() - fromDay(from).getTime()) / DAY_MS) + 1;
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

const PRESET_DAYS: Record<Exclude<RangePreset, "custom" | "12m">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Reads `?range=&from=&to=`. Invalid or missing values fall back to the last 30 days; custom
 * ranges are clamped to today and to MAX_RANGE_DAYS.
 */
export function parseRange(
  params: { range?: string | string[]; from?: string | string[]; to?: string | string[] },
  now: Date,
): RangeWithPrevious {
  const today = toDay(now);
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const preset = (RANGE_PRESETS as readonly string[]).includes(first(params.range) ?? "")
    ? (first(params.range) as RangePreset)
    : "30d";

  let from: string;
  let to = today;
  if (preset === "custom") {
    const fromParam = dateString.safeParse(first(params.from));
    const toParam = dateString.safeParse(first(params.to));
    if (!fromParam.success || !toParam.success) return withPrevious(presetRange("30d", today));
    to = toParam.data > today ? today : toParam.data;
    from = fromParam.data > to ? to : fromParam.data;
    if (daysBetween(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
    return withPrevious({ preset, from, to, days: daysBetween(from, to) });
  }
  return withPrevious(presetRange(preset, today));
}

function presetRange(preset: Exclude<RangePreset, "custom">, today: string): DateRange {
  if (preset === "12m") {
    const start = fromDay(today);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    const from = addDays(toDay(start), 1);
    return { preset, from, to: today, days: daysBetween(from, today) };
  }
  const days = PRESET_DAYS[preset];
  return { preset, from: addDays(today, -(days - 1)), to: today, days };
}

/** The period of the same length that ends the day before `from`. */
function withPrevious(range: DateRange): RangeWithPrevious {
  const to = addDays(range.from, -1);
  return { ...range, previous: { from: addDays(to, -(range.days - 1)), to } };
}

/** Percent change from the previous period; null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
