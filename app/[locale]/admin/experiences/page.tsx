import { prisma } from "@/lib/prisma";
import AdminExperiencesClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminExperiencesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/auth/login");

  const experiences = await prisma.experience.findMany({
    orderBy: { startDate: "desc" }
  });

  return <AdminExperiencesClient initialExperiences={experiences} />;
}
