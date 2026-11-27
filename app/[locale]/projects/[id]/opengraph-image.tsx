import { getTranslations } from "next-intl/server";
import { getProjectPage } from "@/lib/data/projects";
import { getTranslated } from "@/lib/i18n-utils";
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
  const [result, context, t] = await Promise.all([
    getProjectPage(id),
    seoContext(locale),
    getTranslations({ locale, namespace: "seo.kind" }),
  ]);
  const project = result.kind === "found" ? result.project : null;
  return ogCard({
    locale,
    kicker: project?.primaryLanguage
      ? `${t("project")} · ${project.primaryLanguage}`
      : t("project"),
    title: project ? getTranslated(project, "title", locale) : context.name,
    description: project ? getTranslated(project, "summary", locale) : null,
    footer: `${context.name} · demircucu.com`,
  });
}
