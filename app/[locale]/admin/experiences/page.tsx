import { prisma } from "@/lib/prisma";
import AdminExperiencesClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/auth/login`);

  const experiences = await prisma.experience.findMany({
    orderBy: { startDate: "desc" }
  });

  return <AdminExperiencesClient initialExperiences={experiences} />;
}
