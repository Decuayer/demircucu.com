import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSkillForest } from "@/lib/data/skills";
import { pageMetadata } from "@/lib/seo/metadata";
import SkillsClient from "./client";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/skills">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "skills" });
  return pageMetadata({
    locale,
    path: "/skills",
    title: t("title"),
    description: t("description"),
  });
}

export default async function SkillsPage() {
  return <SkillsClient forest={await getSkillForest()} />;
}
