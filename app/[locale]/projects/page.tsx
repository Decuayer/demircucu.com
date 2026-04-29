import { getProjects } from "@/app/actions/projects";
import ProjectsClient from "./client";

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClient projects={projects} />;
}
