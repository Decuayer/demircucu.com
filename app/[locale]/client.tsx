"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code2, Briefcase, Newspaper, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-r from-violet-500/5 to-cyan-500/5 rounded-full blur-3xl" />
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

        <div className="container mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-3xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-xs font-medium bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Full-Stack Developer
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6"
            >
              {settings?.heroTitle || (
                <>
                  Merhaba, Ben{" "}
                  <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                    Demircucu
                  </span>
                </>
              )}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              {settings?.heroSub || t("heroSub")}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-4 pt-4">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-violet-500/25"
                >
                  {t("heroCta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border/50 hover:bg-accent"
                >
                  {t("featuredProjects")}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-12"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
                <Code2 className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">{t("featuredProjects")}</h2>
            </div>
            <Link href="/projects">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/projects/${project.slug}`}>
                  <Card className="group h-full border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg group-hover:text-violet-400 transition-colors">
                          {project.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {project.summary}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <Badge
                            key={tag.name}
                            variant="secondary"
                            className="text-xs bg-accent/50 hover:bg-accent"
                          >
                            {tag.name}
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
      <section className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-12"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10">
                <Newspaper className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">{t("latestPosts")}</h2>
            </div>
            <Link href="/blog">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("viewAll")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card className="group h-full border-border/50 bg-card/50 hover:bg-card hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time>{new Date(post.createdAt).toLocaleDateString()}</time>
                        <span>·</span>
                        <span>{Math.max(1, Math.ceil(post.content.length / 1000))} dk okuma</span>
                      </div>
                      <h3 className="font-semibold text-lg group-hover:text-cyan-400 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center text-sm text-cyan-400 font-medium">
                        {t("readMore")} <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
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
      <section className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/5 via-background to-cyan-500/5 p-8 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                  <Briefcase className="h-6 w-6 text-violet-400" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                {settings?.ctaTitle || "Birlikte Çalışalım"}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed whitespace-pre-line">
                {settings?.ctaDescription || "Yazılım geliştirme konusunda deneyimli bir geliştirici olarak,\nprojelerinize değer katmak için buradayım."}
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link href="/contact">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0"
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
