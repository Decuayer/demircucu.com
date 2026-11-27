import { getTranslations } from "next-intl/server";
import { getPublishedExperience } from "@/lib/data/experiences";
import { getTranslated } from "@/lib/i18n-utils";
import { textBlocksToPlain } from "@/lib/text/blocks";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/seo/og";
import { seoContext } from "@/lib/seo/site";

export const alt = "demircucu.com";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const [experience, context, t] = await Promise.all([
    getPublishedExperience(id),
    seoContext(locale),
    getTranslations({ locale, namespace: "seo.kind" }),
  ]);
  return ogCard({
    locale,
    kicker: experience ? `${t("experience")} · ${experience.company}` : t("experience"),
    title: experience ? getTranslated(experience, "position", locale) : context.name,
    description: experience
      ? textBlocksToPlain(getTranslated(experience, "description", locale))
      : null,
    footer: `${context.name} · demircucu.com`,
  });
}
