import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo/metadata";

const SECTIONS = [
  "controller",
  "analytics",
  "notCollected",
  "cookies",
  "retention",
  "accounts",
  "processors",
  "rights",
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return pageMetadata({
    locale,
    path: "/privacy",
    title: t("title"),
    description: t("description"),
  });
}

/** Privacy policy. Static text from messages/*.json (privacy.*). */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <h1 className="mb-2 text-h1 text-balance">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("updated")}</p>
      <p className="mb-12 text-lead text-pretty text-muted-foreground">{t("intro")}</p>
      <div className="space-y-12">
        {SECTIONS.map((section) => {
          const items = t.raw(`${section}.items`) as string[] | undefined;
          return (
            <section key={section} aria-labelledby={`privacy-${section}`}>
              <h2 id={`privacy-${section}`} className="mb-3 text-h3">
                {t(`${section}.title`)}
              </h2>
              <p className="max-w-prose text-muted-foreground">{t(`${section}.body`)}</p>
              {items && items.length > 0 && (
                <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 text-muted-foreground marker:text-link">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}
