import { useTranslations } from "next-intl";
import { splitMonths } from "@/lib/experience/duration";

/** "1 yıl 3 ay" / "1 yr 3 mos" for a length in months (see lib/experience/duration). */
export function useDurationLabel() {
  const t = useTranslations("duration");
  return (total: number) => {
    const { years, months } = splitMonths(total);
    return [
      years > 0 ? t("years", { count: years }) : null,
      months > 0 ? t("months", { count: months }) : null,
    ]
      .filter(Boolean)
      .join(" ");
  };
}
