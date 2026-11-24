import { adminGetSiteSettings } from "@/lib/data/admin";
import AdminSettingsClient from "./client";

export default async function AdminSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AdminSettingsClient initialSettings={await adminGetSiteSettings()} />
    </div>
  );
}
