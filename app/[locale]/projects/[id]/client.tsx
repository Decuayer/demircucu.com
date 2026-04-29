"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Code2, FileIcon } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";

import { Project, Tag } from "@prisma/client";

interface ProjectDetailClientProps {
  project: Project & { tags: Tag[] };
}

export default function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const t = useTranslations("projects");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/projects">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("allProjects")}
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center border border-border/50">
                {project.logo ? (
                  <img src={project.logo} alt={project.title} className="w-10 h-10 object-contain rounded" />
                ) : (
                  <Code2 className="h-8 w-8 text-cyan-400" />
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{project.title}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{project.summary}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-border/50">
                  <GithubIcon className="mr-2 h-4 w-4" />
                  {t("viewGithub")}
                </Button>
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("liveSite")}
                </Button>
              </a>
            )}
          </div>

          {/* Tech Stack */}
          {project.tags && project.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("techStack")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge key={tag.name} variant="secondary" className="bg-accent/50">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {(project.description && project.description.trim() !== "") && (
            <Card className="border-border/50 bg-card/50 mb-8">
              <CardContent className="p-8 prose dark:prose-invert prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: project.description }} />
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {project.files && Array.isArray(project.files) && project.files.length > 0 && (
            <div className="mb-8 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-violet-400" />
                Ekli Dosyalar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(project.files as any[]).map((file, i) => (
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
        </motion.div>
      </div>
    </div>
  );
}
