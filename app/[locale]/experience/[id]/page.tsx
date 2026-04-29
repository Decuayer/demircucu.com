import { getExperienceById } from "@/app/actions/experience";
import { notFound } from "next/navigation";
import ExperienceDetailClient from "./client";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperienceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const experience = await getExperienceById(id);

  if (!experience) {
    notFound();
  }

  return <ExperienceDetailClient experience={experience} />;
}
