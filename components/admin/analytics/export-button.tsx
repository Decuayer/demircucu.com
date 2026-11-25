"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";

/** Downloads the current view as CSV (`/api/admin/analytics/export`, admin only). */
export function ExportButton({ scope }: { scope: Record<string, string> }) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const params = new URLSearchParams({ locale });
  for (const key of ["range", "from", "to"]) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(scope)) params.set(key, value);
  return (
    <a
      href={`/api/admin/analytics/export?${params.toString()}`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
      download
    >
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {t("exportCsv")}
    </a>
  );
}
