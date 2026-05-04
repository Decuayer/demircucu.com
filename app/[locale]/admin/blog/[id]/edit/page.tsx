import { getCurrentUser } from "@/app/actions/auth";
import { getBlogPostById } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import BlogFormClient from "../../form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/en/auth/login");

  const { id } = await params;
  const post = await getBlogPostById(id);

  if (!post) {
    redirect("/admin/blog");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BlogFormClient initialData={post} isEdit />
    </div>
  );
}
