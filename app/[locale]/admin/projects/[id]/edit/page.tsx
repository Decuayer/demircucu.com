import { getCurrentUser } from "@/app/actions/auth";
import { getProjectById } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import ProjectFormClient from "../../form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/auth/login");

  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    redirect("/admin/projects");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectFormClient initialData={project} isEdit />
    </div>
  );
}
