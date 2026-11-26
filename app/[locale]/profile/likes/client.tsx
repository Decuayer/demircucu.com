"use client";

import type { Prisma } from "@prisma/client";

type LikeWithPost = Prisma.LikeGetPayload<{
  include: {
    post: { select: { id: true; titleTr: true; titleEn: true; slug: true; createdAt: true } };
  };
}>;
type CommentWithPost = Prisma.CommentGetPayload<{
  include: { post: { select: { titleTr: true; titleEn: true; slug: true } } };
}>;

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { Heart, MessageSquare, Calendar, ChevronRight } from "lucide-react";
import { getTranslated, formatDate } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

export default function ProfileLikesClient({
  likes,
  comments,
}: {
  likes: LikeWithPost[];
  comments: CommentWithPost[];
}) {
  const t = useTranslations("nav");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 md:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-muted p-3">
          <Heart className="h-6 w-6 text-link" />
        </div>
        <h1 className="text-3xl font-bold">{t("activities") || "Aktivitelerim"}</h1>
      </div>

      <Tabs defaultValue="likes" className="w-full">
        <TabsList className="mb-8 bg-accent/50 p-1">
          <TabsTrigger
            value="likes"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            <Heart className="mr-2 h-4 w-4" />
            {t("likes") || "Beğenilerim"} ({likes.length})
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("myComments") || "Yorumlarım"} ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="likes" className="space-y-4">
          {likes.length === 0 ? (
            <p className="text-muted-foreground">
              {t("noLikes") || "Henüz hiçbir yazıyı beğenmediniz."}
            </p>
          ) : (
            likes.map((like) => (
              <Link key={like.id} href={`/blog/${like.post.slug}`}>
                <Card className="group cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/40 hover:bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium transition-colors group-hover:text-link">
                        {getTranslated(like.post, "title", locale)}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(like.createdAt)} {t("liked") || "tarihinde beğenildi"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-link" />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-muted-foreground">
              {t("noComments") || "Henüz hiçbir yorum yapmadınız."}
            </p>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <Link
                      href={`/blog/${comment.post.slug}`}
                      className="text-sm font-medium text-link hover:underline"
                    >
                      {getTranslated(comment.post, "title", locale)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {comment.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
