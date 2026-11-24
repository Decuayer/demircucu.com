import { adminGithubOverview, adminListProjects } from "@/lib/data/admin";
import AdminProjectsClient from "./client";

export default async function AdminProjectsPage() {
  const [projects, github] = await Promise.all([adminListProjects(), adminGithubOverview()]);
  return <AdminProjectsClient initialProjects={projects} github={github} />;
}
