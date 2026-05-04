import { getCurrentUser } from "@/app/actions/auth";
import { getExperienceById } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import ExperienceFormClient from "../../form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExperiencePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const { id } = await params;
  const experience = await getExperienceById(id);

  if (!experience) {
    redirect("/admin/experiences");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ExperienceFormClient initialData={experience} isEdit />
    </div>
  );
}
