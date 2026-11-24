import { notFound } from "next/navigation";
import { adminGetExperience, adminListTagOptions } from "@/lib/data/admin";
import ExperienceFormClient from "../../form-client";

export default async function EditExperiencePage({
  params,
}: PageProps<"/[locale]/admin/experiences/[id]/edit">) {
  const { id } = await params;
  const [experience, tagOptions] = await Promise.all([
    adminGetExperience(id),
    adminListTagOptions(),
  ]);
  if (!experience) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <ExperienceFormClient initialData={experience} tagOptions={tagOptions} isEdit />
    </div>
  );
}
