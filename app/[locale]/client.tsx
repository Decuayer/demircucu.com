"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code2, Briefcase, Newspaper, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { getTranslated, formatDate } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

import { Project, BlogPost, Tag } from "@prisma/client";

interface HomeClientProps {
  featuredProjects: (Project & { tags: Tag[] })[];
  latestPosts: (BlogPost & { tags: Tag[] })[];
  settings?: any;
}

export default function HomeClient({ featuredProjects, latestPosts, settings }: HomeClientProps) {
  const t = useTranslations("home");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl delay-1000" />
          <div className="absolute top-1/2 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500/5 to-cyan-500/5 blur-3xl" />
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
          <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl space-y-6">
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="secondary"
                className="border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-500/20"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {getTranslated(settings, "heroSub", locale) || t("heroSub")}
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl"
            >
              {t("heroTitle")}{" "}
              <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                {getTranslated(settings, "heroTitle", locale) || (
                  <>
                    {t("heroTitle")}{" "}
                    <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                      Demircucu
                    </span>
                  </>
                )}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-muted-foreground"
            >
              {getTranslated(settings, "heroSub", locale) || t("heroSub")}
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <Link href="/contact">
                <Button
                  size="lg"
                  className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-cyan-700"
                >
                  {t("heroCta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline" className="border-border/50 hover:bg-accent">
                  {t("featuredProjects")}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <Code2 className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("featuredProjects")}</h2>
            </div>
            <Link href="/projects">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/projects/${project.slug}`}>
                  <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:bg-card hover:shadow-lg hover:shadow-violet-500/5">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold transition-colors group-hover:text-violet-400">
                          {getTranslated(project, "title", locale)}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-violet-400" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {getTranslated(project, "summary", locale)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="bg-accent/50 text-xs hover:bg-accent"
                          >
                            {getTranslated(tag, "name", locale)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="border-t border-border/40 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <Newspaper className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("latestPosts")}</h2>
            </div>
            <Link href="/blog">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-cyan-500/30 hover:bg-card hover:shadow-lg hover:shadow-cyan-500/5">
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
                      <h3 className="text-lg font-semibold transition-colors group-hover:text-cyan-400">
                        {getTranslated(post, "title", locale)}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {getTranslated(post, "excerpt", locale)}
                      </p>
                      <div className="flex items-center text-sm font-medium text-cyan-400">
                        {t("readMore")}{" "}
                        <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview / CTA */}
      <section className="border-t border-border/40 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/5 via-background to-cyan-500/5 p-8 text-center md:p-16"
          >
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                  <Briefcase className="h-6 w-6 text-violet-400" />
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
                  <Button
                    size="lg"
                    className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700"
                  >
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
          </motion.div>
        </div>
      </section>
    </div>
  );
}
