import { getSiteSettings } from "@/lib/data/settings";
import ContactClient from "./client";

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return <ContactClient settings={settings} />;
}
