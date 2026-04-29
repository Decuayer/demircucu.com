"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, ExternalLink, ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/icons";

import { Project, Tag } from "@prisma/client";

interface ProjectsClientProps {
  projects: (Project & { tags: Tag[] })[];
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const t = useTranslations("projects");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          >
            <Code2 className="h-3 w-3 mr-1" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold">{t("title")}</h1>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="group h-full border-border/50 bg-card/50 hover:bg-card hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
                <CardContent className="p-6 space-y-4 h-full flex flex-col">
                  {/* Project header */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform">
                      <Code2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="flex gap-2">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
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
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <Link href={`/projects/${project.slug}`}>
                      <h3 className="font-semibold text-lg group-hover:text-cyan-400 transition-colors cursor-pointer">
                        {project.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {project.summary}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge
                        key={tag.name}
                        variant="secondary"
                        className="text-xs bg-accent/50"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>

                  {/* View details */}
                  <Link href={`/projects/${project.slug}`}>
                    <div className="flex items-center text-sm text-cyan-400 font-medium pt-2 cursor-pointer">
                      {t("viewProject")}
                      <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
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
