import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EntityAnalyticsView } from "@/components/admin/analytics/entity";
import { getEntityAnalytics } from "@/lib/analytics/queries";
import { parseRange, toDay } from "@/lib/analytics/range";

/** Static pages and the home page, keyed by path (`?path=/about`). */
export default async function PageAnalyticsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/analytics/pages">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const raw = Array.isArray(query.path) ? query.path[0] : query.path;
  if (!raw || !raw.startsWith("/") || raw.length > 512) notFound();
  // Ranges are relative to the request time.
  await connection();
  const now = new Date();
  const range = parseRange(query, now);
  const data = await getEntityAnalytics("PAGE", raw, range, locale === "en" ? "en" : "tr");
  if (!data) notFound();
  return (
    <EntityAnalyticsView
      data={data}
      range={range}
      today={toDay(now)}
      exportScope={{ scope: "page", key: raw }}
    />
  );
}
