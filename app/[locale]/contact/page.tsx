import { getSiteSettings } from "@/app/actions/settings";
import ContactClient from "./client";

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return <ContactClient settings={settings} />;
}
