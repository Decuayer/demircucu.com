import { notFound } from "next/navigation";
import { adminGetPost } from "@/lib/data/admin";
import BlogFormClient from "../../form-client";

export default async function EditBlogPage({
  params,
}: PageProps<"/[locale]/admin/blog/[id]/edit">) {
  const { id } = await params;
  const post = await adminGetPost(id);
  if (!post) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <BlogFormClient initialData={post} isEdit />
    </div>
  );
}
