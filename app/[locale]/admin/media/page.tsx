import { getCurrentUser } from "@/app/actions/auth";
import { getMediaFiles } from "@/app/actions/media";
import { redirect } from "next/navigation";
import AdminMediaClient from "./client";

export default async function AdminMediaPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const initialFiles = await getMediaFiles();

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminMediaClient initialFiles={initialFiles} />
    </div>
  );
}
