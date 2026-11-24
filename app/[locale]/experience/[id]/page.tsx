import { notFound } from "next/navigation";
import { getPublishedExperience, getPublishedExperienceIds } from "@/lib/data/experiences";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import ExperienceDetailClient from "./client";

export async function generateStaticParams() {
  const ids = await getPublishedExperienceIds();
  return atLeastOne(
    ids.map((id) => ({ id })),
    { id: EMPTY_PARAM_PLACEHOLDER },
  );
}

export default async function ExperienceDetailPage({
  params,
}: PageProps<"/[locale]/experience/[id]">) {
  const { id } = await params;
  const experience = await getPublishedExperience(id);
  if (!experience) notFound();
  return <ExperienceDetailClient experience={experience} />;
}
