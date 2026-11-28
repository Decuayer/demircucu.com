"use client";

import { formatDate } from "@/lib/format-date";
import { useTranslations } from "next-intl";
import { readingMinutes } from "@/lib/reading-time";
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
import { PageShell } from "@/components/layout/page-header";
import { Prose } from "@/components/prose";
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
    <PageShell width="article">
      <div className="enter">
        <Link href="/blog">
          <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("title")}
          </Button>
        </Link>

        {/* Article Header */}
        <article>
          <header className="mb-12">
            <TagChips tags={post.tags} locale={locale} className="mb-4" />
            <h1 className="mb-6 text-h1 text-balance">{getTranslated(post, "title", locale)}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    DC
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">Demircucu</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Calendar aria-hidden className="h-4 w-4" />
                <time>{formatDate(post.createdAt, locale)}</time>
              </div>
              <div className="flex items-center gap-2">
                <Clock aria-hidden className="h-4 w-4" />
                <span>
                  {readingMinutes(content)} {t("readTime")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye aria-hidden className="h-4 w-4" />
                <span>{post.viewCount}</span>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <Prose html={content} size="article" className="mb-12" />

          {/* Files */}
          {toAttachments(post.files).length > 0 && (
            <div className="mb-12 space-y-4">
              <h2 className="flex items-center gap-2 text-h4">
                <FileIcon className="h-5 w-5 text-link" />
                Ekli Dosyalar
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {toAttachments(post.files).map((file, i) => (
                  <a
                    key={i}
                    href={attachmentHref(file) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/40 hover:bg-card">
                      <CardContent className="flex items-center gap-3 p-4">
                        <FileIcon className="h-4 w-4 shrink-0 text-link" />
                        <p className="truncate text-sm font-medium">{file.name}</p>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Like Button */}
          <div className="mb-12 flex items-center gap-4 border-t border-b border-border/50 py-6">
            <Button
              variant={liked ? "default" : "outline"}
              onClick={handleLike}
              className={liked ? "border-0" : "border-border/50"}
            >
              <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {liked ? t("liked") || "Beğenildi" : t("like") || "Beğen"} ({likesCount})
            </Button>
          </div>
        </article>

        {/* Comments Section */}
        <section className="space-y-8">
          <h2 className="flex items-center gap-3 text-h3">
            <MessageSquare aria-hidden className="h-5 w-5 text-link" />
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
                    className="resize-none bg-accent/30"
                    rows={3}
                    disabled
                  />
                  <Button disabled className="border-0 bg-primary text-primary-foreground">
                    {t("submitComment") || "Yorum Gönder"}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <Textarea
                    name="content"
                    placeholder={t("writeComment") || "Yorumunuzu buraya yazın..."}
                    className="resize-none bg-accent/30"
                    rows={3}
                    maxLength={2000}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="border-0 bg-primary text-primary-foreground"
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
                      <AvatarFallback className="bg-muted text-xs text-link">
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
    </PageShell>
  );
}
