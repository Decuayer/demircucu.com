import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import AdminClientLayout from "./client-layout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/en/auth/login");
  }

  // Check role in database
  const profile = await prisma.profile.findUnique({
    where: { id: user.id }
  });

  if (!profile || profile.role !== "ADMIN") {
    redirect("/"); // If logged in but not admin, send to homepage
  }

  return <AdminClientLayout>{children}</AdminClientLayout>;
}
