import { adminListTags } from "@/lib/data/admin";
import AdminTagsClient from "./client";

export default async function AdminTagsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AdminTagsClient tags={await adminListTags()} />
    </div>
  );
}
