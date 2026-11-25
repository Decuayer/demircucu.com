"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a page streams in after client navigation; prerendered pages never show it. */
export default function Loading() {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-busy="true"
      className="container mx-auto max-w-5xl space-y-6 px-4 py-16 md:px-6 md:py-24"
    >
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
