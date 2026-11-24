import { adminListPosts } from "@/lib/data/admin";
import AdminBlogClient from "./client";

export default async function AdminBlogPage() {
  return <AdminBlogClient initialPosts={await adminListPosts()} />;
}
