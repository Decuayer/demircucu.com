import { getPublishedProjects } from "@/lib/data/projects";
import ProjectsClient from "./client";

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();
  return <ProjectsClient projects={projects} />;
}
