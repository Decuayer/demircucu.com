/**
 * Chart colours from the theme tokens (app/globals.css), so charts follow light / dark.
 * One accent (violet) for the main series; secondary series are neutral and dashed.
 */
export const CHART_COLORS = {
  violet: "var(--chart-1)",
  neutral: "var(--chart-2)",
  muted: "var(--chart-4)",
  palette: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ],
} as const;
