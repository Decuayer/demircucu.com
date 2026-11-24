import { adminListContactMessages } from "@/lib/data/admin";
import AdminContactsClient from "./client";

export default async function AdminContactsPage() {
  return <AdminContactsClient initialMessages={await adminListContactMessages()} />;
}
