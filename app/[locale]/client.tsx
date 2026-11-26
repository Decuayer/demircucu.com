import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cvUrlFor } from "@/lib/cv";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code2, Briefcase, Download, Newspaper, Sparkles } from "lucide-react";
import { getTranslated, formatDate } from "@/lib/i18n-utils";

import type { PublicPost, PublicProject, PublicSiteSettings } from "@/lib/types/content";
import { TagChips } from "@/components/tags/tag-chips";

interface HomeClientProps {
  featuredProjects: PublicProject[];
  latestPosts: PublicPost[];
  settings?: PublicSiteSettings | null;
}

export default function HomeClient({ featuredProjects, latestPosts, settings }: HomeClientProps) {
  const t = useTranslations("home");
  const tCv = useTranslations("cv");
  const locale = useLocale();
  const cvUrl = cvUrlFor(settings, locale);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-muted blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-muted blur-3xl delay-1000" />
          <div className="absolute top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center md:px-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="enter" style={{ "--enter-delay": "0ms" } as CSSProperties}>
              <Badge
                variant="secondary"
                className="border-primary/40 bg-muted px-4 py-1.5 text-xs font-medium text-link hover:bg-accent"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {getTranslated(settings, "heroSub", locale) || t("heroSub")}
              </Badge>
            </div>

            <h1
              className="enter mb-6 text-4xl font-extrabold tracking-tight md:text-6xl"
              style={{ "--enter-delay": "100ms" } as CSSProperties}
            >
              {t("heroTitle")}{" "}
              <span className="text-link">
                {getTranslated(settings, "heroTitle", locale) || (
                  <>
                    {t("heroTitle")} <span className="text-link">Demircucu</span>
                  </>
                )}
              </span>
            </h1>

            <p
              className="enter mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground"
              style={{ "--enter-delay": "200ms" } as CSSProperties}
            >
              {getTranslated(settings, "heroSub", locale) || t("heroSub")}
            </p>

            <div
              className="enter flex flex-wrap items-center justify-center gap-4 pt-4"
              style={{ "--enter-delay": "300ms" } as CSSProperties}
            >
              <Link href="/contact">
                <Button size="lg" className="border-0 bg-primary text-primary-foreground shadow-lg">
                  {t("heroCta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline" className="border-border/50 hover:bg-accent">
                  {t("featuredProjects")}
                </Button>
              </Link>
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="document"
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className: "border-border/50 hover:bg-accent",
                  })}
                >
                  <Download aria-hidden className="mr-2 h-4 w-4" />
                  {tCv("download")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex h-10 w-6 justify-center rounded-full border-2 border-muted-foreground/30 pt-2">
            <div className="h-2 w-1 animate-bounce rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="border-t border-border/40 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="reveal mb-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Code2 className="h-5 w-5 text-link" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("featuredProjects")}</h2>
            </div>
            <Link href="/projects">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project) => (
              <div key={project.id} className="reveal">
                <Card className="group relative h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold transition-colors group-hover:text-link">
                        <Link
                          href={`/projects/${project.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {getTranslated(project, "title", locale)}
                        </Link>
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-link" />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {getTranslated(project, "summary", locale)}
                    </p>
                    <TagChips tags={project.tags} locale={locale} chipClassName="text-xs" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="border-t border-border/40 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="reveal mb-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Newspaper className="h-5 w-5 text-link" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("latestPosts")}</h2>
            </div>
            <Link href="/blog">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <div key={post.id} className="reveal">
                <Link href={`/blog/${post.slug}`}>
                  <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time>{formatDate(post.createdAt)}</time>
                        <span>·</span>
                        <span>
                          {Math.max(
                            1,
                            Math.ceil(getTranslated(post, "content", locale).length / 1000),
                          )}{" "}
                          dk okuma
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold transition-colors group-hover:text-link">
                        {getTranslated(post, "title", locale)}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {getTranslated(post, "excerpt", locale)}
                      </p>
                      <div className="flex items-center text-sm font-medium text-link">
                        {t("readMore")}{" "}
                        <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview / CTA */}
      <section className="border-t border-border/40 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="reveal relative overflow-hidden rounded-2xl border border-border/50 bg-muted via-background p-8 text-center md:p-16">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-muted blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-muted blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Briefcase className="h-6 w-6 text-link" />
                </div>
              </div>
              <h2 className="text-3xl font-bold md:text-4xl">
                {getTranslated(settings, "ctaTitle", locale) || "Birlikte Çalışalım"}
              </h2>
              <p className="mx-auto max-w-xl leading-relaxed whitespace-pre-line text-muted-foreground">
                {getTranslated(settings, "ctaDescription", locale) ||
                  "Yazılım geliştirme konusunda deneyimli bir geliştirici olarak,\nprojelerinize değer katmak için buradayım."}
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link href="/contact">
                  <Button size="lg" className="border-0 bg-primary text-primary-foreground">
                    {t("heroCta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline">
                    {t("aboutPreview")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
