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
  return {
    title: getTranslated(project, "title", locale),
    description: getTranslated(project, "summary", locale) || undefined,
    alternates: { canonical: getPathname({ locale, href: `/projects/${project.slug}` }) },
  };
}

export default async function ProjectDetailPage({ params }: PageProps<"/[locale]/projects/[id]">) {
  const { locale, id } = await params;
  const result = await getProjectPage(id);
  if (result.kind === "redirect") {
    permanentRedirect(getPathname({ locale, href: `/projects/${result.slug}` }));
  }
  if (result.kind === "notFound") notFound();
  const { project } = result;
  return (
    <ProjectDetailClient
      project={project}
      readmeHtml={project.readmeHtml ? localizeReadmeHtml(project.readmeHtml, locale) : null}
      headings={readmeHeadings(project.readmeHtml)}
    />
  );
}
