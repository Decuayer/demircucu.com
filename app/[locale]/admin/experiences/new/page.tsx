import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ExperienceFormClient from "../form-client";

export default async function NewExperiencePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/auth/login");

  return (
    <div className="container mx-auto px-4 py-8">
      <ExperienceFormClient />
    </div>
  );
}
