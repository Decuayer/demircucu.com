import { getSiteSettings } from "@/lib/data/settings";
import { getSkillForest } from "@/lib/data/skills";
import AboutClient from "./client";

export default async function AboutPage() {
  const [settings, skillForest] = await Promise.all([getSiteSettings(), getSkillForest()]);
  return <AboutClient settings={settings} skillForest={skillForest} />;
}
