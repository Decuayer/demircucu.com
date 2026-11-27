import { getTranslations } from "next-intl/server";
import { getTranslated } from "@/lib/i18n-utils";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/seo/og";
import { seoContext } from "@/lib/seo/site";

export const alt = "demircucu.com";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Default card for every page without its own (name, role, intro). */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [context, meta] = await Promise.all([
    seoContext(locale),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  const s = context.settings;
  return ogCard({
    locale,
    kicker: getTranslated(s, "heroSub", locale) || "demircucu.com",
    title: context.name,
    description:
      getTranslated(s, "heroIntro", locale) ||
      getTranslated(s, "siteDescription", locale) ||
      meta("defaultDescription"),
    footer: "demircucu.com",
  });
}
