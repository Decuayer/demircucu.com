import { getTranslations } from "next-intl/server";
import { getSkillPage } from "@/lib/data/skills";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/seo/og";
import { seoContext } from "@/lib/seo/site";
import { tagLabel } from "@/lib/tags/view";

export const alt = "demircucu.com";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [result, context, t, skills] = await Promise.all([
    getSkillPage(slug),
    seoContext(locale),
    getTranslations({ locale, namespace: "seo.kind" }),
    getTranslations({ locale, namespace: "skills" }),
  ]);
  if (result.kind !== "found") {
    return ogCard({
      locale,
      kicker: t("skill"),
      title: context.name,
      footer: "demircucu.com",
    });
  }
  const { tag, projects, experiences, posts } = result.skill;
  const name = tagLabel(tag, locale);
  return ogCard({
    locale,
    kicker: t("skill"),
    title: name,
    description:
      (locale === "tr" ? tag.descriptionTr : tag.descriptionEn) ||
      skills("metaDescription", {
        name,
        projects: projects.length,
        experiences: experiences.length,
        posts: posts.length,
      }),
    footer: `${context.name} · demircucu.com`,
  });
}
