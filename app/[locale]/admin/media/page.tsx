import { adminListMediaFiles } from "@/lib/data/admin";
import AdminMediaClient from "./client";

export default async function AdminMediaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AdminMediaClient initialFiles={await adminListMediaFiles()} />
    </div>
  );
}
