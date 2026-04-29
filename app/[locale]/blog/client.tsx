"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Eye, Clock, ArrowRight, TrendingUp } from "lucide-react";

import { BlogPost, Tag } from "@prisma/client";

type BlogPostWithTags = BlogPost & { tags: Tag[] };

function PostCard({ post, index }: { post: BlogPostWithTags; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/blog/${post.slug}`}>
        <Card className="group h-full border-border/50 bg-card/50 hover:bg-card hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{Math.max(1, Math.ceil(post.content.length / 1000))} dk</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{post.viewCount}</span>
              </div>
              <span>·</span>
              <time>{new Date(post.createdAt).toLocaleDateString()}</time>
            </div>
            <h3 className="font-semibold text-lg group-hover:text-cyan-400 transition-colors">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge
                  key={tag.name}
                  variant="secondary"
                  className="text-xs bg-accent/50"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center text-sm text-cyan-400 font-medium pt-1">
              Devamını Oku <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

interface BlogClientProps {
  posts: BlogPostWithTags[];
}

export default function BlogClient({ posts }: BlogClientProps) {
  const t = useTranslations("blog");
  const mostRead = [...posts].sort((a, b) => b.viewCount - a.viewCount);
  const latest = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          >
            <Newspaper className="h-3 w-3 mr-1" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold">{t("title")}</h1>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-accent/50">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latest.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="popular">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mostRead.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
