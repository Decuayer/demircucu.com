import { getSiteSettings } from "@/lib/data/settings";
import AboutClient from "./client";

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return <AboutClient settings={settings} />;
}
