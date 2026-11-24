import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, getPublishedPostSlugs } from "@/lib/data/posts";
import { getPostEngagement, hasUserLikedPost } from "@/lib/data/interactions";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import { getCurrentUser } from "@/lib/auth/session";
import BlogDetailClient from "./client";

export async function generateStaticParams() {
  const slugs = await getPublishedPostSlugs();
  return atLeastOne(
    slugs.map((slug) => ({ slug })),
    { slug: EMPTY_PARAM_PLACEHOLDER },
  );
}

type Post = NonNullable<Awaited<ReturnType<typeof getPublishedPostBySlug>>>;
type Engagement = Awaited<ReturnType<typeof getPostEngagement>>;

/** Request-time part: whether the visitor is signed in and has liked the post. */
async function ViewerAwarePost({ post, engagement }: { post: Post; engagement: Engagement }) {
  const user = await getCurrentUser();
  const liked = user ? await hasUserLikedPost(post.id, user.id) : false;
  return (
    <BlogDetailClient
      post={post}
      initialComments={engagement.comments}
      initialLikesCount={engagement.likesCount}
      initialUserLiked={liked}
      currentUser={user ? { id: user.id } : null}
    />
  );
}

export default async function BlogDetailPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const engagement = await getPostEngagement(post.id);

  // The static shell shows the full article as an anonymous visitor would see it; the
  // viewer-specific version streams in once the session is known.
  return (
    <Suspense
      fallback={
        <BlogDetailClient
          post={post}
          initialComments={engagement.comments}
          initialLikesCount={engagement.likesCount}
          initialUserLiked={false}
          currentUser={null}
        />
      }
    >
      <ViewerAwarePost post={post} engagement={engagement} />
    </Suspense>
  );
}
