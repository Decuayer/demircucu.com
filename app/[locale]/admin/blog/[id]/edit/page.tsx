import { notFound } from "next/navigation";
import { adminGetPost, adminListTagOptions } from "@/lib/data/admin";
import BlogFormClient from "../../form-client";

export default async function EditBlogPage({
  params,
}: PageProps<"/[locale]/admin/blog/[id]/edit">) {
  const { id } = await params;
  const [post, tagOptions] = await Promise.all([adminGetPost(id), adminListTagOptions()]);
  if (!post) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <BlogFormClient initialData={post} tagOptions={tagOptions} isEdit />
    </div>
  );
}
