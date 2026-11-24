"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Building2 } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { getTranslated } from "@/lib/i18n-utils";
import { attachmentHref, toAttachments } from "@/lib/media/attachments";
import { useParams } from "next/navigation";

import type { PublicExperience } from "@/lib/types/content";
import { tagLabel } from "@/lib/tags/view";
import { FileIcon } from "lucide-react";

interface ExperienceDetailClientProps {
  experience: PublicExperience;
}

export default function ExperienceDetailClient({ experience }: ExperienceDetailClientProps) {
  const t = useTranslations("experience");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Back button */}
          <Link href="/experience">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("title")}
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/50 bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                <Building2 className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold md:text-4xl">{experience.company}</h1>
                <p className="text-lg text-muted-foreground">
                  {getTranslated(experience, "position", locale)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(experience.startDate).toLocaleDateString()} —{" "}
                  {experience.endDate
                    ? new Date(experience.endDate).toLocaleDateString()
                    : t("present")}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-8 flex flex-wrap gap-2">
            {experience.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="bg-accent/50">
                {tagLabel(tag, locale)}
              </Badge>
            ))}
          </div>

          {/* Details */}
          <Card className="mb-8 border-border/50 bg-card/50">
            <CardContent className="prose prose-sm max-w-none p-8 dark:prose-invert">
              <div
                dangerouslySetInnerHTML={{
                  __html: getTranslated(experience, "details", locale) || "",
                }}
              />
            </CardContent>
          </Card>

          {/* Files */}
          {experience.files && Array.isArray(experience.files) && experience.files.length > 0 && (
            <div className="mb-8 space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <FileIcon className="h-5 w-5 text-violet-400" />
                Ekli Dosyalar
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {toAttachments(experience.files).map((file, i) => (
                  <a
                    key={i}
                    href={attachmentHref(file) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-violet-500/30 hover:bg-card">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileIcon className="h-4 w-4 shrink-0 text-cyan-400" />
                          <p className="truncate text-sm font-medium">{file.name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Link */}
          {experience.githubUrl && (
            <a href={experience.githubUrl} target="_blank" rel="noopener noreferrer">
              <Button className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700">
                <GithubIcon className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
}
