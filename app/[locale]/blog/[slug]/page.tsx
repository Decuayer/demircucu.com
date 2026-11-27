import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { getTranslated } from "@/lib/i18n-utils";
import { blogPosting, breadcrumbs } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import { tagLabel } from "@/lib/tags/view";
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};
  const context = await seoContext(locale);
  return pageMetadata({
    locale,
    image: "own",
    path: `/blog/${post.slug}`,
    title: getTranslated(post, "title", locale),
    description: getTranslated(post, "excerpt", locale),
    type: "article",
    publishedTime: post.createdAt,
    modifiedTime: post.updatedAt,
    tags: post.tags.map((tag) => tagLabel(tag, locale)),
    twitterCreator: context.twitter,
  });
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
  const { locale, slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const [engagement, context, t] = await Promise.all([
    getPostEngagement(post.id),
    seoContext(locale),
    getTranslations({ locale, namespace: "blog" }),
  ]);
  const title = getTranslated(post, "title", locale);
  const path = `/blog/${post.slug}`;
  const structured = (
    <JsonLd
      data={[
        blogPosting({
          base: context.base,
          locale,
          path,
          headline: title,
          description: getTranslated(post, "excerpt", locale),
          datePublished: post.createdAt,
          dateModified: post.updatedAt,
          image: post.coverUrl,
          keywords: post.tags.map((tag) => tagLabel(tag, locale)),
          authorName: context.name,
        }),
        breadcrumbs(context.base, locale, [
          { name: t("title"), path: "/blog" },
          { name: title, path },
        ]),
      ]}
    />
  );

  // The static shell shows the full article as an anonymous visitor would see it; the
  // viewer-specific version streams in once the session is known.
  return (
    <>
      {structured}
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
    </>
  );
}
