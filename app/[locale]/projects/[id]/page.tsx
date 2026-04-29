import { getProjectBySlug } from "@/app/actions/projects";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./client";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectBySlug(id);

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
