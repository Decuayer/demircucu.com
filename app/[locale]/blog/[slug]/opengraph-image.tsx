import { getTranslations } from "next-intl/server";
import { getPublishedPostBySlug } from "@/lib/data/posts";
import { formatDate } from "@/lib/format-date";
import { getTranslated } from "@/lib/i18n-utils";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/seo/og";
import { seoContext } from "@/lib/seo/site";

export const alt = "demircucu.com";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [post, context, t] = await Promise.all([
    getPublishedPostBySlug(slug),
    seoContext(locale),
    getTranslations({ locale, namespace: "seo.kind" }),
  ]);
  return ogCard({
    locale,
    kicker: post ? `${t("blog")} · ${formatDate(post.createdAt, locale)}` : t("blog"),
    title: post ? getTranslated(post, "title", locale) : context.name,
    description: post ? getTranslated(post, "excerpt", locale) : null,
    footer: `${context.name} · demircucu.com`,
  });
}
