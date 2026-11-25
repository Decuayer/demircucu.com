"use client";

import { formatDate } from "@/lib/format-date";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  User,
  FileIcon,
} from "lucide-react";
import { useState } from "react";
import { getTranslated } from "@/lib/i18n-utils";
import { attachmentHref, toAttachments } from "@/lib/media/attachments";
import { useParams } from "next/navigation";

import { useTransition } from "react";
import { toast } from "sonner";
import { addComment, toggleLike } from "@/app/actions/blog_interaction";
import type { PublicPost } from "@/lib/types/content";
import { TagChips } from "@/components/tags/tag-chips";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";

interface PublicComment {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null };
}

interface BlogDetailClientProps {
  post: PublicPost;
  initialComments: PublicComment[];
  initialLikesCount: number;
  initialUserLiked: boolean;
  /** Only whether someone is signed in matters here. */
  currentUser: { id: string } | null;
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
  const errorMessage = useActionErrorMessage();

  const content = getTranslated(post, "content", locale);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error(t("loginToLike") || "Beğenmek için giriş yapmalısınız.");
      return;
    }

    // Optimistic UI update
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    const res = await toggleLike({ postId: post.id });

    // Revert if error
    if (res?.error) {
      setLiked(liked);
      setLikesCount(likesCount);
      toast.error(errorMessage(res.error));
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get("content") as string;

    startTransition(async () => {
      const res = await addComment({ postId: post.id, content });
      if (res?.error) {
        toast.error(errorMessage(res.error));
      } else {
        toast.success(t("commentSuccess") || "Yorumunuz eklendi.");
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <div className="enter">
          <Link href="/blog">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("title")}
            </Button>
          </Link>

          {/* Article Header */}
          <article>
            <header className="mb-10">
              <TagChips tags={post.tags} locale={locale} className="mb-4" />
              <h1 className="mb-4 text-3xl leading-tight font-bold md:text-4xl">
                {getTranslated(post, "title", locale)}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-violet-500 to-cyan-500 text-xs text-white">
                      DC
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">Demircucu</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <time>{formatDate(post.createdAt, locale)}</time>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {Math.max(1, Math.ceil(content.length / 1000))} {t("readTime") || "dk"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.viewCount}</span>
                </div>
              </div>
            </header>

            {/* Article Content */}
            <div
              className="prose prose-sm mb-10 max-w-none md:prose-base dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:leading-relaxed prose-p:text-muted-foreground prose-strong:text-foreground prose-code:rounded prose-code:bg-accent/50 prose-code:px-1 prose-code:py-0.5 prose-code:text-cyan-400 prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-accent/30 prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Files */}
            {toAttachments(post.files).length > 0 && (
              <div className="mb-10 space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <FileIcon className="h-5 w-5 text-violet-400" />
                  Ekli Dosyalar
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {toAttachments(post.files).map((file, i) => (
                    <a
                      key={i}
                      href={attachmentHref(file) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Card className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-violet-500/30 hover:bg-card">
                        <CardContent className="flex items-center gap-3 p-4">
                          <FileIcon className="h-4 w-4 shrink-0 text-cyan-400" />
                          <p className="truncate text-sm font-medium">{file.name}</p>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Like Button */}
            <div className="mb-10 flex items-center gap-4 border-t border-b border-border/50 py-6">
              <Button
                variant={liked ? "default" : "outline"}
                onClick={handleLike}
                className={
                  liked
                    ? "border-0 bg-gradient-to-r from-pink-600 to-rose-600 text-white"
                    : "border-border/50"
                }
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {liked ? t("liked") || "Beğenildi" : t("like") || "Beğen"} ({likesCount})
              </Button>
            </div>
          </article>

          {/* Comments Section */}
          <section className="space-y-8">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              {t("comments")} ({initialComments.length})
            </h2>

            {/* Comment Form */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="space-y-4 p-6">
                {!currentUser ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("loginToComment") || "Yorum yapmak için giriş yapmalısınız."}
                    </p>
                    <Textarea
                      placeholder={t("writeComment") || "Yorumunuzu buraya yazın..."}
                      className="resize-none border-border/50 bg-accent/30"
                      rows={3}
                      disabled
                    />
                    <Button
                      disabled
                      className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
                    >
                      {t("submitComment") || "Yorum Gönder"}
                    </Button>
                  </>
                ) : (
                  <form onSubmit={handleCommentSubmit} className="space-y-4">
                    <Textarea
                      name="content"
                      placeholder={t("writeComment") || "Yorumunuzu buraya yazın..."}
                      className="resize-none border-border/50 bg-accent/30"
                      rows={3}
                      maxLength={2000}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700"
                    >
                      {isPending ? t("submitting") : t("submitComment")}
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
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border/50">
                        <AvatarFallback className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-xs text-violet-400">
                          {comment.author.name?.charAt(0).toUpperCase() || (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {comment.author.name || t("anonymousUser")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {comment.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
