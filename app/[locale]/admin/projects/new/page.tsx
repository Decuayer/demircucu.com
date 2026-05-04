import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ProjectFormClient from "../form-client";

export default async function NewProjectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/auth/login`);

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectFormClient />
    </div>
  );
}
