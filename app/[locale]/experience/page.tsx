import { getExperiences } from "@/app/actions/experience";
import ExperienceClient from "./client";

export const revalidate = 3600;

export default async function ExperiencePage() {
  const experiences = await getExperiences();
  return <ExperienceClient experiences={experiences} />;
}
