"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Building2 } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";

import { Experience } from "@prisma/client";
import { FileIcon } from "lucide-react";

interface ExperienceDetailClientProps {
  experience: Experience & { tags: { name: string }[] };
}

export default function ExperienceDetailClient({ experience }: ExperienceDetailClientProps) {
  const t = useTranslations("experience");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back button */}
          <Link href="/experience">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("title")}
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center border border-border/50">
                <Building2 className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{experience.company}</h1>
                <p className="text-lg text-muted-foreground">{experience.position}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(experience.startDate).toLocaleDateString()} — {experience.endDate ? new Date(experience.endDate).toLocaleDateString() : t("present")}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {experience.tags.map((tag) => (
              <Badge key={tag.name} variant="secondary" className="bg-accent/50">
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Details */}
          <Card className="border-border/50 bg-card/50 mb-8">
            <CardContent className="p-8 prose dark:prose-invert prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: experience.details || "" }} />
            </CardContent>
          </Card>

          {/* Files */}
          {experience.files && Array.isArray(experience.files) && experience.files.length > 0 && (
            <div className="mb-8 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-violet-400" />
                Ekli Dosyalar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(experience.files as any[]).map((file, i) => (
                  <a key={i} href={file.url} target="_blank" rel="noopener noreferrer">
                    <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                          <p className="text-sm font-medium truncate">{file.name}</p>
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
            <a
              href={experience.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0">
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
