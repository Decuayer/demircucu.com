import { prisma } from "@/lib/prisma";
import AdminProjectsClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminProjectsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const projects = await prisma.project.findMany({
    orderBy: { order: "asc" }
  });

  return <AdminProjectsClient initialProjects={projects} />;
}
