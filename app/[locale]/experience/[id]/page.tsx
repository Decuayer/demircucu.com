import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { getTranslated } from "@/lib/i18n-utils";
import { textBlocksToPlain } from "@/lib/text/blocks";
import { breadcrumbs } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { notFound } from "next/navigation";
import { getPublishedExperience, getPublishedExperienceIds } from "@/lib/data/experiences";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import ExperienceDetailClient from "./client";

export async function generateStaticParams() {
  const ids = await getPublishedExperienceIds();
  return atLeastOne(
    ids.map((id) => ({ id })),
    { id: EMPTY_PARAM_PLACEHOLDER },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/experience/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const experience = await getPublishedExperience(id);
  if (!experience) return {};
  const context = await seoContext(locale);
  return pageMetadata({
    locale,
    image: "own",
    path: `/experience/${experience.id}`,
    title: `${getTranslated(experience, "position", locale)} · ${experience.company}`,
    description: textBlocksToPlain(getTranslated(experience, "description", locale)),
    twitterCreator: context.twitter,
  });
}

export default async function ExperienceDetailPage({
  params,
}: PageProps<"/[locale]/experience/[id]">) {
  const { locale, id } = await params;
  const experience = await getPublishedExperience(id);
  if (!experience) notFound();
  const [context, t] = await Promise.all([
    seoContext(locale),
    getTranslations({ locale, namespace: "experience" }),
  ]);
  return (
    <>
      <JsonLd
        data={breadcrumbs(context.base, locale, [
          { name: t("title"), path: "/experience" },
          { name: experience.company, path: `/experience/${experience.id}` },
        ])}
      />
      <ExperienceDetailClient experience={experience} />
    </>
  );
}
