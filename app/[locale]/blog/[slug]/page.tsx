import { getBlogPostBySlug } from "@/app/actions/blog";
import { getPostInteractions } from "@/app/actions/blog_interaction";
import { getCurrentUser } from "@/app/actions/auth";
import { notFound } from "next/navigation";
import BlogDetailClient from "./client";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { comments, likesCount, userLiked } = await getPostInteractions(post.id);
  const currentUser = await getCurrentUser();

  return (
    <BlogDetailClient
      post={post}
      initialComments={comments}
      initialLikesCount={likesCount}
      initialUserLiked={userLiked}
      currentUser={currentUser}
    />
  );
}
