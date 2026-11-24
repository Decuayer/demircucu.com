import { notFound } from "next/navigation";
import { adminGetProject, adminListTagOptions } from "@/lib/data/admin";
import ProjectFormClient from "../../form-client";

export default async function EditProjectPage({
  params,
}: PageProps<"/[locale]/admin/projects/[id]/edit">) {
  const { id } = await params;
  const [project, tagOptions] = await Promise.all([adminGetProject(id), adminListTagOptions()]);
  if (!project) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectFormClient initialData={project} tagOptions={tagOptions} isEdit />
    </div>
  );
}
