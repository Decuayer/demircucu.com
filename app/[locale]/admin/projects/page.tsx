import { adminListProjects } from "@/lib/data/admin";
import AdminProjectsClient from "./client";

export default async function AdminProjectsPage() {
  return <AdminProjectsClient initialProjects={await adminListProjects()} />;
}
