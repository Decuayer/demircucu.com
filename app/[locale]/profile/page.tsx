import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./client";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
 
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return <ProfileClient user={user} />;
}
