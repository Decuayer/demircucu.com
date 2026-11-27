const DAY_MS = 86_400_000;
const AVERAGE_MONTH_DAYS = 30.44;

/** Months between two dates, rounded, at least 1 (16 June – 11 July is one month). */
export function monthsBetween(start: Date, end: Date): number {
  const days = (end.getTime() - start.getTime()) / DAY_MS;
  return Math.max(1, Math.round(days / AVERAGE_MONTH_DAYS));
}

export function splitMonths(total: number): { years: number; months: number } {
  return { years: Math.floor(total / 12), months: total % 12 };
}
