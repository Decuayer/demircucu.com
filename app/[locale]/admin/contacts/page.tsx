import AdminContactsClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { getContactMessages } from "@/app/actions/admin";
import { redirect } from "next/navigation";

export default async function AdminContactsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const messages = await getContactMessages();

  return <AdminContactsClient initialMessages={messages} />;
}
