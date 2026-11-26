"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, MessageSquare, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format-date";
import { deleteComment, setCommentHidden } from "@/app/actions/admin";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";

interface ModeratedComment {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date;
  author: { name: string | null; email: string };
  post: { titleTr: string; titleEn: string; slug: string };
}

export default function AdminCommentsClient({
  initialComments,
}: {
  initialComments: ModeratedComment[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const errorMessage = useActionErrorMessage();
  const [comments, setComments] = useState(initialComments);
  const [isPending, startTransition] = useTransition();

  const toggleHidden = (comment: ModeratedComment) =>
    startTransition(async () => {
      const res = await setCommentHidden({ id: comment.id, hidden: !comment.hidden });
      if (res.error) return void toast.error(errorMessage(res.error));
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, hidden: !comment.hidden } : c)),
      );
      toast.success(comment.hidden ? t("commentShown") : t("commentHidden"));
    });

  const remove = (id: string) =>
    startTransition(async () => {
      if (!window.confirm(t("commentDeleteConfirm"))) return;
      const res = await deleteComment(id);
      if (res.error) return void toast.error(errorMessage(res.error));
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success(t("commentDeleted"));
    });

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold">
        <MessageSquare className="h-6 w-6 text-link" />
        {t("comments")}
      </h1>

      {comments.length === 0 && <p className="text-muted-foreground">{t("noComments")}</p>}

      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className="border-border/50 bg-card/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{comment.author.name ?? comment.author.email}</span>
                  <span className="text-muted-foreground">
                    {formatDate(comment.createdAt, locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {comment.hidden && <Badge variant="secondary">{t("hiddenBadge")}</Badge>}
                </div>
                <Link href={`/blog/${comment.post.slug}`} className="text-link hover:underline">
                  {locale === "tr" ? comment.post.titleTr : comment.post.titleEn}
                </Link>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{comment.content}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => toggleHidden(comment)}
                >
                  {comment.hidden ? (
                    <Eye className="mr-2 h-4 w-4" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}
                  {comment.hidden ? t("showComment") : t("hideComment")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={isPending}
                  onClick={() => remove(comment.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
