import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";

const SECTIONS = [
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
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getPathname({ locale, href: "/privacy" }) },
  };
}

/** Privacy policy. Static text from messages/*.json (privacy.*). */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="mb-2 text-3xl font-bold md:text-4xl">{t("title")}</h1>
      <p className="mb-10 text-sm text-muted-foreground">{t("updated")}</p>
      <p className="mb-10 leading-relaxed text-muted-foreground">{t("intro")}</p>
      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const items = t.raw(`${section}.items`) as string[] | undefined;
          return (
            <section key={section} aria-labelledby={`privacy-${section}`}>
              <h2 id={`privacy-${section}`} className="mb-3 text-xl font-semibold">
                {t(`${section}.title`)}
              </h2>
              <p className="leading-relaxed text-muted-foreground">{t(`${section}.body`)}</p>
              {items && items.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
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
