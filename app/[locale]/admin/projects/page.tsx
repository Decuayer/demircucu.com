import { prisma } from "@/lib/prisma";
import AdminProjectsClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/auth/login`);

  const projects = await prisma.project.findMany({
    orderBy: { order: "asc" }
  });

  return <AdminProjectsClient initialProjects={projects} />;
}
