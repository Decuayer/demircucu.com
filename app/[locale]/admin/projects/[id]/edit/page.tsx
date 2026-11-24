import { notFound } from "next/navigation";
import { adminGetProject } from "@/lib/data/admin";
import ProjectFormClient from "../../form-client";

export default async function EditProjectPage({
  params,
}: PageProps<"/[locale]/admin/projects/[id]/edit">) {
  const { id } = await params;
  const project = await adminGetProject(id);
  if (!project) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectFormClient initialData={project} isEdit />
    </div>
  );
}
