"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type DateRange, type RangePreset } from "@/lib/analytics/range";

/** Preset buttons plus a custom from/to range; the choice lives in the URL (`?range=`). */
export function RangePicker({ range, today }: { range: DateRange; today: string }) {
  const t = useTranslations("analytics.range");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [custom, setCustom] = useState(range.preset === "custom");

  const go = (preset: RangePreset, extra?: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("from");
    params.delete("to");
    if (extra) {
      params.set("from", extra.from);
      params.set("to", extra.to);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="range-picker">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border/50 bg-card/50 p-1">
        {RANGE_PRESETS.map((preset) => {
          const active = preset === "custom" ? custom : !custom && range.preset === preset;
          return (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={active ? "secondary" : "ghost"}
              className={cn("h-7 px-2.5 text-xs", active && "text-foreground")}
              aria-pressed={active}
              onClick={() =>
                preset === "custom" ? setCustom(true) : (setCustom(false), go(preset))
              }
            >
              {t(preset)}
            </Button>
          );
        })}
      </div>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (from && to) go("custom", { from, to });
          }}
        >
          <Input
            type="date"
            aria-label={t("from")}
            className="h-8 w-auto"
            value={from}
            max={today}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label={t("to")}
            className="h-8 w-auto"
            value={to}
            max={today}
            onChange={(event) => setTo(event.target.value)}
          />
          <Button type="submit" size="sm" className="h-8">
            {t("apply")}
          </Button>
        </form>
      )}
    </div>
  );
}
