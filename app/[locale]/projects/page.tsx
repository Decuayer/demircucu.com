import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { getPublishedProjects } from "@/lib/data/projects";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredProjects from "./filtered";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  const [t, seoT, context] = await Promise.all([
    getTranslations({ locale, namespace: "projects" }),
    getTranslations({ locale, namespace: "seo" }),
    seoContext(locale),
  ]);
  return pageMetadata({
    locale,
    path: "/projects",
    title: t("title"),
    description: seoT("projects"),
    type: "website",
    twitterCreator: context.twitter,
  });
}

export default async function Page() {
  const [projects, filterData] = await Promise.all([getPublishedProjects(), getTagFilterData()]);
  return <FilteredProjects projects={projects} filterData={filterData} />;
}
