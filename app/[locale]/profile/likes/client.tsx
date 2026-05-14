"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { Heart, MessageSquare, Calendar, ChevronRight } from "lucide-react";
import { getTranslated, formatDate } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

export default function ProfileLikesClient({ likes, comments }: { likes: any[], comments: any[] }) {
  const t = useTranslations("nav");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-pink-500/10 rounded-xl">
          <Heart className="w-6 h-6 text-pink-400" />
        </div>
        <h1 className="text-3xl font-bold">{t("activities") || "Aktivitelerim"}</h1>
      </div>

      <Tabs defaultValue="likes" className="w-full">
        <TabsList className="mb-8 bg-accent/50 p-1">
          <TabsTrigger value="likes" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            <Heart className="w-4 h-4 mr-2" />
            {t("likes") || "Beğenilerim"} ({likes.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("myComments") || "Yorumlarım"} ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="likes" className="space-y-4">
          {likes.length === 0 ? (
            <p className="text-muted-foreground">{t("noLikes") || "Henüz hiçbir yazıyı beğenmediniz."}</p>
          ) : (
            likes.map((like) => (
              <Link key={like.id} href={`/blog/${like.post.slug}`}>
                <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium group-hover:text-violet-400 transition-colors">
                        {getTranslated(like.post, "title", locale)}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(like.createdAt)} {t("liked") || "tarihinde beğenildi"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-muted-foreground">{t("noComments") || "Henüz hiçbir yorum yapmadınız."}</p>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Link href={`/blog/${comment.post.slug}`} className="text-sm font-medium text-violet-400 hover:underline">
                      {getTranslated(comment.post, "title", locale)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
