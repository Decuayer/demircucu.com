import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext, sitePerson } from "@/lib/seo/site";
import { absoluteUrl } from "@/lib/seo/json-ld";
import { plainDescription } from "@/lib/seo/metadata";
import { getTranslated } from "@/lib/i18n-utils";
import { JsonLd } from "@/components/seo/json-ld";
import { getSiteSettings } from "@/lib/data/settings";
import { getSkillForest } from "@/lib/data/skills";
import AboutClient from "./client";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const [t, seoT, context] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "seo" }),
    seoContext(locale),
  ]);
  return pageMetadata({
    locale,
    path: "/about",
    title: t("title"),
    description: seoT("about"),
    type: "profile",
    twitterCreator: context.twitter,
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  const [settings, skillForest, context] = await Promise.all([
    getSiteSettings(),
    getSkillForest(),
    seoContext(locale),
  ]);
  const description = plainDescription(getTranslated(settings, "aboutBio", locale), 300);
  return (
    <>
      <JsonLd
        data={{
          "@type": "ProfilePage",
          url: absoluteUrl(context.base, "/about", locale),
          inLanguage: locale,
          mainEntity: sitePerson(context, locale, { description }),
        }}
      />
      <AboutClient settings={settings} skillForest={skillForest} />
    </>
  );
}
