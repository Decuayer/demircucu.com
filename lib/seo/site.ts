import "server-only";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/data/settings";
import { getAppUrl } from "@/lib/env/app-url";
import { getTranslated } from "@/lib/i18n-utils";
import { stripGreeting } from "@/lib/home/hero";
import { person, type PersonInput } from "./json-ld";

/** Site-wide values for metadata and structured data. */
export async function seoContext(locale: string) {
  const [settings, home] = await Promise.all([
    getSiteSettings(),
    getTranslations({ locale, namespace: "home" }),
  ]);
  const name =
    stripGreeting(getTranslated(settings, "heroTitle", locale), home("greeting"), locale) ||
    "Demir Cücü";
  return { base: getAppUrl(), settings, name, twitter: settings?.socialTwitter ?? null };
}

export type SeoContext = Awaited<ReturnType<typeof seoContext>>;

/** The site owner as a schema.org Person. */
export function sitePerson(context: SeoContext, locale: string, extra: Partial<PersonInput> = {}) {
  const s = context.settings;
  return person({
    base: context.base,
    locale,
    name: context.name,
    jobTitle: getTranslated(s, "heroSub", locale) || null,
    image: s?.aboutPhotoUrl ?? null,
    location: getTranslated(s, "aboutLocation", locale) || null,
    sameAs: [
      s?.socialGithub,
      s?.socialLinkedin,
      s?.socialTwitter,
      s?.socialInstagram,
      s?.socialYoutube,
      s?.socialMedium,
      s?.socialStackoverflow,
    ],
    ...extra,
  });
}
