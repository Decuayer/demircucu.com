"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AnalyticsEntityType } from "@prisma/client";
import type { Breakdowns } from "@/lib/analytics/queries";
import type { BreakdownItem } from "@/lib/analytics/report";
import { countryName } from "@/lib/analytics/format";
import type { BarListItem } from "./bar-list";

export type BreakdownDimension = keyof Breakdowns | "from";

/** Display label of a breakdown value in the admin's language. */
export function useDimensionLabel() {
  const t = useTranslations("analytics");
  const locale = useLocale();
  return (dimension: BreakdownDimension, value: string): string => {
    switch (dimension) {
      case "referrer":
        return value || t("direct");
      case "country":
        return value ? countryName(value, locale) : t("unknown");
      case "device":
        return t(`device.${value as "DESKTOP" | "MOBILE" | "TABLET" | "OTHER"}`);
      case "locale":
        return t(`language.${value === "en" ? "en" : "tr"}`);
      case "outbound":
        return t(`outbound.${value as "GITHUB" | "LIVE" | "DOCUMENT" | "OTHER"}`);
      case "from":
        return value || t("entry");
      default:
        return value || t("unknown");
    }
  };
}

export function useTypeLabel() {
  const t = useTranslations("analytics.types");
  return (type: AnalyticsEntityType) => t(type);
}

export function useBreakdownItems() {
  const label = useDimensionLabel();
  return (dimension: BreakdownDimension, items: BreakdownItem[]): BarListItem[] =>
    items.map((item) => ({
      key: item.value || "-",
      label: label(dimension, item.value),
      views: item.views,
      visitors: dimension === "outbound" ? undefined : item.visitors,
    }));
}
