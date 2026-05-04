"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Clock, Eye, Heart, MessageSquare, Calendar, User, FileIcon } from "lucide-react";
import { useState } from "react";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

import { useTransition } from "react";
import { toast } from "sonner";
import { addComment, toggleLike } from "@/app/actions/blog_interaction";
import { BlogPost, Comment, Tag } from "@prisma/client";

interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    name: string | null;
  };
}

interface BlogDetailClientProps {
  post: BlogPost & { tags: Tag[] };
  initialComments: CommentWithAuthor[];
  initialLikesCount: number;
  initialUserLiked: boolean;
  currentUser: any | null;
}

export default function BlogDetailClient({
  post,
  initialComments,
  initialLikesCount,
  initialUserLiked,
  currentUser,
}: BlogDetailClientProps) {
  const t = useTranslations("blog");
  const params = useParams();
  const locale = params.locale as string;
  const [liked, setLiked] = useState(initialUserLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, startTransition] = useTransition();
  
  const content = getTranslated(post, "content", locale);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error(t("loginToLike") || "Beğenmek için giriş yapmalısınız.");
      return;
    }

    // Optimistic UI update
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    const res = await toggleLike(post.id, `/blog/${post.slug}`);
    
    // Revert if error
    if (res?.error) {
      setLiked(liked);
      setLikesCount(likesCount);
      toast.error(res.error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get("content") as string;

    startTransition(async () => {
      const res = await addComment(post.id, content, `/blog/${post.slug}`);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(t("commentSuccess") || "Yorumunuz eklendi.");
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/blog">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("title")}
            </Button>
          </Link>

          {/* Article Header */}
          <article>
            <header className="mb-10">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="bg-accent/50">
                    {getTranslated(tag, "name", locale)}
                  </Badge>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {getTranslated(post, "title", locale)}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs">
                      DC
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">Demircucu</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <time>{new Date(post.createdAt).toLocaleDateString()}</time>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{Math.max(1, Math.ceil(content.length / 1000))} {t("readTime") || "dk"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.viewCount}</span>
                </div>
              </div>
            </header>

            {/* Article Content */}
            <div
              className="prose dark:prose-invert prose-sm md:prose-base max-w-none mb-10 
                prose-headings:font-bold prose-headings:text-foreground
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-li:text-muted-foreground
                prose-strong:text-foreground
                prose-code:text-cyan-400 prose-code:bg-accent/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-accent/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Files */}
            {post.files && Array.isArray(post.files) && (post.files as any[]).length > 0 && (
              <div className="mb-10 space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-violet-400" />
                  Ekli Dosyalar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(post.files as any[]).map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer">
                      <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-3">
                          <FileIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                          <p className="text-sm font-medium truncate">{file.name}</p>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Like Button */}
            <div className="flex items-center gap-4 py-6 border-t border-b border-border/50 mb-10">
              <Button
                variant={liked ? "default" : "outline"}
                onClick={handleLike}
                className={liked ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white border-0" : "border-border/50"}
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {liked ? (t("liked") || "Beğenildi") : (t("like") || "Beğen")} ({likesCount})
              </Button>
            </div>
          </article>

          {/* Comments Section */}
          <section className="space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              {t("comments")} ({initialComments.length})
            </h2>

            {/* Comment Form */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-4">
                {!currentUser ? (
                  <>
                    <p className="text-sm text-muted-foreground">{t("loginToComment") || "Yorum yapmak için giriş yapmalısınız."}</p>
                    <Textarea
                      placeholder={t("writeComment") || "Yorumunuzu buraya yazın..."}
                      className="bg-accent/30 border-border/50 resize-none"
                      rows={3}
                      disabled
                    />
                    <Button disabled className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                      {t("submitComment") || "Yorum Gönder"}
                    </Button>
                  </>
                ) : (
                  <form onSubmit={handleCommentSubmit} className="space-y-4">
                    <Textarea
                      name="content"
                      placeholder={t("writeComment") || "Yorumunuzu buraya yazın..."}
                      className="bg-accent/30 border-border/50 resize-none"
                      rows={3}
                      required
                    />
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0"
                    >
                      {isPending ? "Gönderiliyor..." : (t("submitComment") || "Yorum Gönder")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Comments List */}
            <div className="space-y-4">
              {initialComments.map((comment) => (
                <Card key={comment.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-8 w-8 border border-border/50">
                        <AvatarFallback className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400 text-xs">
                          {comment.author.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{comment.author.name || "Kullanıcı"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
