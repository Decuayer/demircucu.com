import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./client";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/en/auth/login");
  }

  return <ProfileClient user={user} />;
}
