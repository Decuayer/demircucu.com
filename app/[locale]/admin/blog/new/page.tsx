import { adminListTagOptions } from "@/lib/data/admin";
import BlogFormClient from "../form-client";

export default async function NewBlogPage() {
  const tagOptions = await adminListTagOptions();
  return (
    <div className="container mx-auto px-4 py-8">
      <BlogFormClient tagOptions={tagOptions} />
    </div>
  );
}
