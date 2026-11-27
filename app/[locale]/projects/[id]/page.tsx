import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbs, softwareSourceCode } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { getTranslations } from "next-intl/server";
import { tagLabel } from "@/lib/tags/view";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { getProjectPage, getPublishedProjectSlugs } from "@/lib/data/projects";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import { getTranslated } from "@/lib/i18n-utils";
import { localizeReadmeHtml, readmeHeadings } from "@/lib/projects/readme";
import ProjectDetailClient from "./client";

export async function generateStaticParams() {
  const slugs = await getPublishedProjectSlugs();
  return atLeastOne(
    slugs.map((id) => ({ id })),
    { id: EMPTY_PARAM_PLACEHOLDER },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const result = await getProjectPage(id);
  if (result.kind !== "found") return {};
  const { project } = result;
  const context = await seoContext(locale);
  return pageMetadata({
    locale,
    image: "own",
    path: `/projects/${project.slug}`,
    title: getTranslated(project, "title", locale),
    description: getTranslated(project, "summary", locale),
    type: "article",
    modifiedTime: project.pushedAt ?? project.updatedAt,
    tags: project.tags.map((tag) => tagLabel(tag, locale)),
    twitterCreator: context.twitter,
  });
}

export default async function ProjectDetailPage({ params }: PageProps<"/[locale]/projects/[id]">) {
  const { locale, id } = await params;
  const result = await getProjectPage(id);
  if (result.kind === "redirect") {
    permanentRedirect(getPathname({ locale, href: `/projects/${result.slug}` }));
  }
  if (result.kind === "notFound") notFound();
  const { project } = result;
  const [context, t] = await Promise.all([
    seoContext(locale),
    getTranslations({ locale, namespace: "projects" }),
  ]);
  const title = getTranslated(project, "title", locale);
  const path = `/projects/${project.slug}`;
  return (
    <>
      <JsonLd
        data={[
          softwareSourceCode({
            base: context.base,
            locale,
            path,
            name: title,
            description: getTranslated(project, "summary", locale),
            codeRepository: project.githubUrl,
            programmingLanguage: project.primaryLanguage,
            liveUrl: project.liveUrl,
            dateModified: project.pushedAt ?? project.updatedAt,
            keywords: project.tags.map((tag) => tagLabel(tag, locale)),
          }),
          breadcrumbs(context.base, locale, [
            { name: t("title"), path: "/projects" },
            { name: title, path },
          ]),
        ]}
      />
      <ProjectDetailClient
        project={project}
        readmeHtml={project.readmeHtml ? localizeReadmeHtml(project.readmeHtml, locale) : null}
        headings={readmeHeadings(project.readmeHtml)}
      />
    </>
  );
}
