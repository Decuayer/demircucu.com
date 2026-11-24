import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Briefcase, Code2, Newspaper } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { TagChips } from "@/components/tags/tag-chips";
import { getSkillPage, getSkillSlugs } from "@/lib/data/skills";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import { getTranslated } from "@/lib/i18n-utils";
import { tagLabel } from "@/lib/tags/view";

export async function generateStaticParams() {
  const slugs = await getSkillSlugs();
  return atLeastOne(
    slugs.map((slug) => ({ slug })),
    { slug: EMPTY_PARAM_PLACEHOLDER },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/skills/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getSkillPage(slug);
  if (result.kind !== "found") return {};
  const t = await getTranslations({ locale, namespace: "skills" });
  const { tag, projects, experiences, posts } = result.skill;
  const name = tagLabel(tag, locale);
  const description =
    (locale === "tr" ? tag.descriptionTr : tag.descriptionEn) ||
    t("metaDescription", {
      name,
      projects: projects.length,
      experiences: experiences.length,
      posts: posts.length,
    });
  return {
    title: name,
    description,
    alternates: { canonical: getPathname({ locale, href: `/skills/${tag.slug}` }) },
  };
}

export default async function SkillPage({ params }: PageProps<"/[locale]/skills/[slug]">) {
  const { locale, slug } = await params;
  const result = await getSkillPage(slug);
  if (result.kind === "redirect") {
    permanentRedirect(getPathname({ locale, href: `/skills/${result.slug}` }));
  }
  if (result.kind === "missing") notFound();

  const t = await getTranslations({ locale, namespace: "skills" });
  const { tag, ancestors, children, related, projects, experiences, posts } = result.skill;
  const description = locale === "tr" ? tag.descriptionTr : tag.descriptionEn;
  const month = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
  const { firstUsed, lastUsed, ongoing } = result.skill;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <Link
          href="/skills"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("title")}
        </Link>

        <header className="mb-10 space-y-3">
          {ancestors.length > 0 && (
            <nav aria-label={t("breadcrumb")} className="text-sm text-muted-foreground">
              {ancestors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && " › "}
                  <Link href={`/skills/${a.slug}`} className="hover:underline">
                    {tagLabel(a, locale)}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-3xl font-bold md:text-5xl">{tagLabel(tag, locale)}</h1>
          {description && <p className="text-lg text-muted-foreground">{description}</p>}
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <dt>{t("usage")}:</dt>
              <dd>
                {t("projectsCount", { count: projects.length })} ·{" "}
                {t("experiencesCount", { count: experiences.length })} ·{" "}
                {t("postsCount", { count: posts.length })}
              </dd>
            </div>
            {firstUsed && (
              <div className="flex gap-1">
                <dt>{t("period")}:</dt>
                <dd>
                  {month.format(firstUsed)} –{" "}
                  {ongoing ? t("present") : lastUsed ? month.format(lastUsed) : ""}
                </dd>
              </div>
            )}
          </dl>
        </header>

        {children.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              {t("subSkills")}
            </h2>
            <TagChips tags={children} locale={locale} />
          </section>
        )}

        <ContentSection icon={<Code2 className="h-5 w-5 text-cyan-400" />} title={t("projects")}>
          {projects.map((p) => (
            <ItemCard
              key={p.id}
              href={`/projects/${p.slug}`}
              title={getTranslated(p, "title", locale)}
              text={getTranslated(p, "summary", locale)}
            />
          ))}
        </ContentSection>
        <ContentSection
          icon={<Briefcase className="h-5 w-5 text-violet-400" />}
          title={t("experiences")}
        >
          {experiences.map((e) => (
            <ItemCard
              key={e.id}
              href={`/experience/${e.id}`}
              title={`${e.company} · ${getTranslated(e, "position", locale)}`}
              text={getTranslated(e, "description", locale)}
            />
          ))}
        </ContentSection>
        <ContentSection icon={<Newspaper className="h-5 w-5 text-cyan-400" />} title={t("posts")}>
          {posts.map((p) => (
            <ItemCard
              key={p.id}
              href={`/blog/${p.slug}`}
              title={getTranslated(p, "title", locale)}
              text={getTranslated(p, "excerpt", locale)}
            />
          ))}
        </ContentSection>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              {t("related")}
            </h2>
            <TagChips tags={related} locale={locale} />
          </section>
        )}
      </div>
    </div>
  );
}

function ContentSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode[];
}) {
  if (children.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ItemCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Card className="relative border-border/50 bg-card/50 transition-colors hover:bg-card">
      <CardContent className="space-y-2 p-5">
        <h3 className="font-semibold">
          <Link href={href} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
