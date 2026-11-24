import { getPublishedExperiences } from "@/lib/data/experiences";
import ExperienceClient from "./client";

export default async function ExperiencePage() {
  const experiences = await getPublishedExperiences();
  return <ExperienceClient experiences={experiences} />;
}
