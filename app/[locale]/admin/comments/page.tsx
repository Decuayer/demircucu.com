import { adminListComments } from "@/lib/data/admin";
import AdminCommentsClient from "./client";

export default async function AdminCommentsPage() {
  return <AdminCommentsClient initialComments={await adminListComments()} />;
}
