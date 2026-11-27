import { getHomeExperiences, getHomePosts, getHomeProjects, getHomeSkills } from "@/lib/data/home";
import { getSiteSettings } from "@/lib/data/settings";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { getTranslated } from "@/lib/i18n-utils";
import { pageMetadata } from "@/lib/seo/metadata";
import { website } from "@/lib/seo/json-ld";
import { seoContext, sitePerson } from "@/lib/seo/site";
import HomeClient from "./client";

async function homeDescription(locale: string) {
  const [context, meta] = await Promise.all([
    seoContext(locale),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  const s = context.settings;
  return {
    context,
    description:
      getTranslated(s, "heroIntro", locale) ||
      getTranslated(s, "siteDescription", locale) ||
      meta("defaultDescription"),
    siteName: getTranslated(s, "siteTitle", locale) || meta("defaultTitle"),
  };
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const { context, description } = await homeDescription(locale);
  return pageMetadata({
    locale,
    image: "own",
    path: "/",
    description,
    twitterCreator: context.twitter,
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const [{ context, description, siteName }, settings, projects, experiences, skills, posts] =
    await Promise.all([
      homeDescription(locale),
      getSiteSettings(),
      getHomeProjects(),
      getHomeExperiences(),
      getHomeSkills(),
      getHomePosts(),
    ]);
  return (
    <>
      <JsonLd
        data={[
          website({ base: context.base, locale, name: siteName, description }),
          sitePerson(context, locale),
        ]}
      />
      <HomeClient
        settings={settings}
        projects={projects}
        experiences={experiences}
        skills={skills.skills}
        posts={posts}
      />
    </>
  );
}
