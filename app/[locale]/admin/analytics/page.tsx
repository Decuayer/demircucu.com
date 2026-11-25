import { connection } from "next/server";
import { getAnalyticsOverview } from "@/lib/analytics/queries";
import { parseRange, toDay } from "@/lib/analytics/range";
import AnalyticsOverviewClient from "./client";

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/analytics">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  // Ranges are relative to the request time.
  await connection();
  const now = new Date();
  const range = parseRange(query, now);
  const traffic = await getAnalyticsOverview(range, locale === "en" ? "en" : "tr");
  return <AnalyticsOverviewClient traffic={traffic} range={range} today={toDay(now)} />;
}
