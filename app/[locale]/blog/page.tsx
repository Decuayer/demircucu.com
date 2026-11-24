import { getPublishedPosts } from "@/lib/data/posts";
import BlogClient from "./client";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogClient posts={posts} />;
}
