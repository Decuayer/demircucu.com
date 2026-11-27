import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { getPublishedExperiences } from "@/lib/data/experiences";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredExperience from "./filtered";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/experience">): Promise<Metadata> {
  const { locale } = await params;
  const [t, seoT, context] = await Promise.all([
    getTranslations({ locale, namespace: "experience" }),
    getTranslations({ locale, namespace: "seo" }),
    seoContext(locale),
  ]);
  return pageMetadata({
    locale,
    path: "/experience",
    title: t("title"),
    description: seoT("experience"),
    type: "website",
    twitterCreator: context.twitter,
  });
}

export default async function Page() {
  const [experiences, filterData] = await Promise.all([
    getPublishedExperiences(),
    getTagFilterData(),
  ]);
  return <FilteredExperience experiences={experiences} filterData={filterData} />;
}
