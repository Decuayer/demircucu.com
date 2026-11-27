import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { getPublishedPosts } from "@/lib/data/posts";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredBlog from "./filtered";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  const [t, seoT, context] = await Promise.all([
    getTranslations({ locale, namespace: "blog" }),
    getTranslations({ locale, namespace: "seo" }),
    seoContext(locale),
  ]);
  return pageMetadata({
    locale,
    path: "/blog",
    title: t("title"),
    description: seoT("blog"),
    type: "website",
    twitterCreator: context.twitter,
  });
}

export default async function Page() {
  const [posts, filterData] = await Promise.all([getPublishedPosts(), getTagFilterData()]);
  return <FilteredBlog posts={posts} filterData={filterData} />;
}
