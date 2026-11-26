import Image from "next/image";
import { formatDate } from "@/lib/format-date";
import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  ArrowLeft,
  Code2,
  ExternalLink,
  FileIcon,
  GitFork,
  Languages,
  Scale,
  Star,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GithubIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { getTranslated } from "@/lib/i18n-utils";
import { attachmentHref, toAttachments } from "@/lib/media/attachments";
import { languageShares, type ReadmeHeading } from "@/lib/projects/readme";
import type { ProjectPage } from "@/lib/data/projects";
import { TagChips } from "@/components/tags/tag-chips";
import { ReadmeView } from "@/components/projects/readme-view";
import { ProjectDocuments } from "@/components/projects/documents";
import { ProjectGallery } from "@/components/projects/gallery";
import { LanguageBar } from "@/components/projects/language-bar";

interface ProjectDetailClientProps {
  project: ProjectPage;
  /** Locale-adjusted README HTML. */
  readmeHtml: string | null;
  headings: ReadmeHeading[];
}

/** A table of contents is worth it for long READMEs only. */
const TOC_MIN_HEADINGS = 4;

export default function ProjectDetailClient({
  project,
  readmeHtml,
  headings,
}: ProjectDetailClientProps) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const title = getTranslated(project, "title", locale);
  const description = getTranslated(project, "description", locale).trim();
  const attachments = toAttachments(project.files);
  const shares = languageShares(project.languages, t("otherLanguages"));

  const sections = [
    readmeHtml && { id: "readme", label: t("sections.readme") },
    project.documents.length > 0 && {
      id: "documents",
      label: t("sections.documents", { count: project.documents.length }),
    },
    project.gallery.length > 0 && {
      id: "gallery",
      label: t("sections.gallery", { count: project.gallery.length }),
    },
    (description || attachments.length > 0) && { id: "details", label: t("sections.details") },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  const readmeSection = readmeHtml && (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="min-w-0">
        {locale !== "en" && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-border/50 px-3 py-1 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            {t("readme.originalLanguage")}
          </p>
        )}
        <ReadmeView html={readmeHtml} locale={locale} />
      </div>
      {headings.length >= TOC_MIN_HEADINGS && (
        <nav aria-label={t("readme.toc")} className="hidden lg:block">
          <div className="sticky top-24 space-y-2 text-sm">
            <p className="font-semibold text-muted-foreground">{t("readme.toc")}</p>
            <ul className="space-y-1 border-l border-border/50">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-6" : "pl-3"}>
                  <a
                    href={`#${h.id}`}
                    className="line-clamp-2 text-muted-foreground hover:text-foreground"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );

  const detailsSection = (
    <div className="space-y-8">
      {description && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="prose prose-sm max-w-none p-8 dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: description }} />
          </CardContent>
        </Card>
      )}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FileIcon className="h-5 w-5 text-link" />
            {t("attachments")}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {attachments.map((file, i) => (
              <a
                key={i}
                href={attachmentHref(file) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                data-track="document"
              >
                <Card className="cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/40 hover:bg-card">
                  <CardContent className="flex items-center gap-3 overflow-hidden p-4">
                    <FileIcon className="h-4 w-4 shrink-0 text-link" />
                    <p className="truncate text-sm font-medium">{file.name}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const content: Record<string, React.ReactNode> = {
    readme: readmeSection,
    documents: <ProjectDocuments slug={project.slug} documents={project.documents} />,
    gallery: <ProjectGallery images={project.gallery} />,
    details: detailsSection,
  };

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="enter">
          <Link href="/projects">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("allProjects")}
            </Button>
          </Link>

          <header className="mb-8 max-w-4xl">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted">
                {project.logoUrl ? (
                  <Image
                    src={project.logoUrl}
                    alt={title}
                    width={40}
                    height={40}
                    loading="eager"
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <Code2 className="h-8 w-8 text-link" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold break-words md:text-4xl">{title}</h1>
                {project.isArchived && (
                  <Badge
                    variant="outline"
                    className="mt-2 gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
                  >
                    <Archive className="h-3 w-3" />
                    {t("archived")}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              {getTranslated(project, "summary", locale)}
            </p>
          </header>

          <div className="mb-8 flex flex-wrap gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-track="github"
              >
                <Button variant="outline" className="border-border/50">
                  <GithubIcon className="mr-2 h-4 w-4" />
                  {t("viewGithub")}
                </Button>
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" data-track="live">
                <Button className="border-0 bg-primary text-primary-foreground">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("liveSite")}
                </Button>
              </a>
            )}
          </div>

          {project.source === "GITHUB" && (
            <div className="mb-8 max-w-4xl space-y-4">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4" />
                  {t("meta.stars", { count: project.stars })}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <GitFork className="h-4 w-4" />
                  {t("meta.forks", { count: project.forks })}
                </li>
                {project.license && (
                  <li className="inline-flex items-center gap-1.5">
                    <Scale className="h-4 w-4" />
                    {project.license}
                  </li>
                )}
                {project.pushedAt && (
                  <li className="inline-flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    {t("meta.updated", {
                      date: formatDate(project.pushedAt, locale),
                    })}
                  </li>
                )}
              </ul>
              <LanguageBar shares={shares} label={t("meta.languages")} />
            </div>
          )}

          {project.tags.length > 0 && (
            <div className="mb-10 max-w-4xl">
              <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {t("techStack")}
              </h2>
              <TagChips tags={project.tags} locale={locale} />
            </div>
          )}

          {sections.length > 1 ? (
            <Tabs defaultValue={sections[0]!.id}>
              <TabsList className="mb-6 flex-wrap">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sections.map((s) => (
                <TabsContent key={s.id} value={s.id}>
                  {content[s.id]}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            sections[0] && content[sections[0].id]
          )}
        </div>
      </div>
    </div>
  );
}
