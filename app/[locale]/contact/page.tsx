import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { getSiteSettings } from "@/lib/data/settings";
import ContactClient from "./client";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const [t, seoT, context] = await Promise.all([
    getTranslations({ locale, namespace: "contact" }),
    getTranslations({ locale, namespace: "seo" }),
    seoContext(locale),
  ]);
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("title"),
    description: seoT("contact"),
    type: "website",
    twitterCreator: context.twitter,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return <ContactClient settings={settings} />;
}
