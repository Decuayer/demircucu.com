import { getBlogPosts } from "@/app/actions/blog";
import BlogClient from "./client";

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <BlogClient posts={posts} />;
}
