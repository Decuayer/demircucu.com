"use client";

import { formatDate } from "@/lib/format-date";
import { useTranslations } from "next-intl";
import { readingMinutes } from "@/lib/reading-time";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Eye, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";
import { PageHeader, PageShell } from "@/components/layout/page-header";

import type { PublicPost } from "@/lib/types/content";
import { TagChips } from "@/components/tags/tag-chips";

type BlogPostWithTags = PublicPost;

function PostCard({ post }: { post: BlogPostWithTags }) {
  const t = useTranslations("blog");
  const params = useParams();
  const locale = params.locale as string;
  const content = getTranslated(post, "content", locale);
  return (
    <div className="reveal">
      <Card className="group relative h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {readingMinutes(content)} {t("readTime")}
              </span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{post.viewCount}</span>
            </div>
            <span>·</span>
            <time>{formatDate(post.createdAt, locale)}</time>
          </div>
          <h2 className="text-h3 transition-colors group-hover:text-link">
            {/* Stretched link: the whole card opens the post; tag chips sit above it. */}
            <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
              {getTranslated(post, "title", locale)}
            </Link>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getTranslated(post, "excerpt", locale)}
          </p>
          <TagChips tags={post.tags} locale={locale} chipClassName="text-xs" />
          <div className="flex items-center pt-1 text-sm font-medium text-link">
            {t("readMore")}{" "}
            <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export interface BlogClientProps {
  posts: BlogPostWithTags[];
  /** Active tag filter bar (from the filtered wrapper). */
  filter?: React.ReactNode;
}

export default function BlogClient({ posts, filter }: BlogClientProps) {
  const t = useTranslations("blog");
  const mostRead = [...posts].sort((a, b) => b.viewCount - a.viewCount);
  const latest = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <PageShell>
      <PageHeader eyebrow={t("title")} icon={Newspaper} title={t("title")} />

      {filter}

      {/* Tabs */}
      <Tabs defaultValue="latest" className="w-full">
        <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2 bg-accent/50">
          <TabsTrigger value="latest" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("latest")}
          </TabsTrigger>
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("mostRead")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="latest">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {latest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {mostRead.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
