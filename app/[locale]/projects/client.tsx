"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Code2, ExternalLink, ArrowRight, Star } from "lucide-react";
import { languageColor } from "@/lib/projects/readme";
import { GithubIcon } from "@/components/icons";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";
import { PageHeader, PageShell } from "@/components/layout/page-header";

import type { PublicProject } from "@/lib/types/content";
import { TagChips } from "@/components/tags/tag-chips";

export interface ProjectsClientProps {
  projects: PublicProject[];
  /** Active tag filter bar (from the filtered wrapper). */
  filter?: React.ReactNode;
}

export default function ProjectsClient({ projects, filter }: ProjectsClientProps) {
  const t = useTranslations("projects");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <PageShell>
      <PageHeader eyebrow={t("title")} icon={Code2} title={t("title")} />

      {filter}

      {/* Projects grid (animations are per card; the filtered list re-renders in place) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <div key={project.id} className="reveal">
            <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg">
              <CardContent className="flex h-full flex-col space-y-4 p-6">
                {/* Project header */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-muted transition-transform group-hover:scale-110">
                    <Code2 className="h-6 w-6 text-link" />
                  </div>
                  <div className="flex gap-2">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 transition-colors hover:bg-accent"
                        aria-label={`${t("viewGithub")}: ${getTranslated(project, "title", locale)}`}
                      >
                        <GithubIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        data-track="live"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 transition-colors hover:bg-accent"
                        aria-label={`${t("liveSite")}: ${getTranslated(project, "title", locale)}`}
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <Link href={`/projects/${project.slug}`}>
                    <h2 className="cursor-pointer text-h3 transition-colors group-hover:text-link">
                      {getTranslated(project, "title", locale)}
                    </h2>
                  </Link>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {getTranslated(project, "summary", locale)}
                  </p>
                </div>

                {/* Repository facts */}
                {(project.primaryLanguage || project.stars > 0 || project.isArchived) && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {project.primaryLanguage && (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: languageColor(project.primaryLanguage) }}
                        />
                        {project.primaryLanguage}
                      </span>
                    )}
                    {project.stars > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {project.stars}
                      </span>
                    )}
                    {project.isArchived && (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Archive className="h-3.5 w-3.5" />
                        {t("archived")}
                      </span>
                    )}
                  </div>
                )}

                {/* Tags */}
                <TagChips tags={project.tags} locale={locale} chipClassName="text-xs" />

                {/* View details */}
                <Link href={`/projects/${project.slug}`}>
                  <div className="flex cursor-pointer items-center pt-2 text-sm font-medium text-link">
                    {t("viewProject")}
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
