import { prisma } from "@/lib/prisma";
import AdminBlogClient from "./client";
import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminBlogPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" }
  });

  return <AdminBlogClient initialPosts={posts} />;
}
