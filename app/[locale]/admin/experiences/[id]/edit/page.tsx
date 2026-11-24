import { notFound } from "next/navigation";
import { adminGetExperience } from "@/lib/data/admin";
import ExperienceFormClient from "../../form-client";

export default async function EditExperiencePage({
  params,
}: PageProps<"/[locale]/admin/experiences/[id]/edit">) {
  const { id } = await params;
  const experience = await adminGetExperience(id);
  if (!experience) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <ExperienceFormClient initialData={experience} isEdit />
    </div>
  );
}
