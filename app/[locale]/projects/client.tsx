"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, ExternalLink, ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

import type { PublicProject } from "@/lib/types/content";
import { tagLabel } from "@/lib/tags/view";

interface ProjectsClientProps {
  projects: PublicProject[];
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const t = useTranslations("projects");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <Badge
            variant="secondary"
            className="mb-4 border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-cyan-400"
          >
            <Code2 className="mr-1 h-3 w-3" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">{t("title")}</h1>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-cyan-500/30 hover:bg-card hover:shadow-lg hover:shadow-cyan-500/5">
                <CardContent className="flex h-full flex-col space-y-4 p-6">
                  {/* Project header */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 transition-transform group-hover:scale-110">
                      <Code2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="flex gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg p-2 transition-colors hover:bg-accent"
                        >
                          <GithubIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg p-2 transition-colors hover:bg-accent"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <Link href={`/projects/${project.slug}`}>
                      <h3 className="cursor-pointer text-lg font-semibold transition-colors group-hover:text-cyan-400">
                        {getTranslated(project, "title", locale)}
                      </h3>
                    </Link>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {getTranslated(project, "summary", locale)}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="bg-accent/50 text-xs">
                        {tagLabel(tag, locale)}
                      </Badge>
                    ))}
                  </div>

                  {/* View details */}
                  <Link href={`/projects/${project.slug}`}>
                    <div className="flex cursor-pointer items-center pt-2 text-sm font-medium text-cyan-400">
                      {t("viewProject")}
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
