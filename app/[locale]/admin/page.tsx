import { connection } from "next/server";
import { getDashboard } from "@/lib/analytics/queries";
import { parseRange, toDay } from "@/lib/analytics/range";
import DashboardClient from "./dashboard-client";

export default async function AdminDashboardPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  // Ranges are relative to the request time.
  await connection();
  const now = new Date();
  const range = parseRange(query, now);
  const data = await getDashboard(range, locale === "en" ? "en" : "tr");
  return <DashboardClient data={data} range={range} today={toDay(now)} />;
}
