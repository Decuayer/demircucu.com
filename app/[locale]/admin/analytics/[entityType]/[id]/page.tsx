import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EntityAnalyticsView } from "@/components/admin/analytics/entity";
import { entityTypeFromSegment, getEntityAnalytics } from "@/lib/analytics/queries";
import { parseRange, toDay } from "@/lib/analytics/range";

export default async function EntityAnalyticsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/analytics/[entityType]/[id]">) {
  const [{ locale, entityType: segment, id }, query] = await Promise.all([params, searchParams]);
  const entityType = entityTypeFromSegment(segment);
  if (!entityType) notFound();
  // Ranges are relative to the request time.
  await connection();
  const now = new Date();
  const range = parseRange(query, now);
  let key: string;
  try {
    key = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const data = await getEntityAnalytics(entityType, key, range, locale === "en" ? "en" : "tr");
  if (!data) notFound();
  return (
    <EntityAnalyticsView
      data={data}
      range={range}
      today={toDay(now)}
      exportScope={{ scope: segment, key }}
    />
  );
}
