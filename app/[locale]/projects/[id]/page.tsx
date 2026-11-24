import { notFound } from "next/navigation";
import { getPublishedProjectBySlug, getPublishedProjectSlugs } from "@/lib/data/projects";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import ProjectDetailClient from "./client";

export async function generateStaticParams() {
  const slugs = await getPublishedProjectSlugs();
  return atLeastOne(
    slugs.map((id) => ({ id })),
    { id: EMPTY_PARAM_PLACEHOLDER },
  );
}

export default async function ProjectDetailPage({ params }: PageProps<"/[locale]/projects/[id]">) {
  const { id } = await params;
  const project = await getPublishedProjectBySlug(id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
