import AdminContactsClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { getContactMessages } from "@/app/actions/admin";
import { redirect } from "next/navigation";

export default async function AdminContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/${locale}/auth/login`);

  const messages = await getContactMessages();

  return <AdminContactsClient initialMessages={messages} />;
}
