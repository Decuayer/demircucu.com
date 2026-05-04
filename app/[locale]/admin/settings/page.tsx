import { getCurrentUser } from "@/app/actions/auth";
import { getSiteSettings } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import AdminSettingsClient from "./client";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/auth/login`);

  const settings = await getSiteSettings();

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminSettingsClient initialSettings={settings} />
    </div>
  );
}
