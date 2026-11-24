import { adminGithubOverview, adminListProjects } from "@/lib/data/admin";
import AdminProjectsClient from "./client";

/** "Sync now" runs inside this page's server action, after the response (`after`). */
export const maxDuration = 300;

export default async function AdminProjectsPage() {
  const [projects, github] = await Promise.all([adminListProjects(), adminGithubOverview()]);
  return <AdminProjectsClient initialProjects={projects} github={github} />;
}
