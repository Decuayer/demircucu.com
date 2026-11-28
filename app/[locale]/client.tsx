import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Download, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { TagChips } from "@/components/tags/tag-chips";
import { cvUrlFor } from "@/lib/cv";
import { formatDate } from "@/lib/format-date";
import { getTranslated } from "@/lib/i18n-utils";
import { useDurationLabel } from "@/components/experience/duration";
import { stripGreeting } from "@/lib/home/hero";
import { projectGrid } from "@/lib/home/layout";
import { tagLabel } from "@/lib/tags/view";
import { cn } from "@/lib/utils";
import type { HomeExperience, HomePost, HomeProject, HomeSkill } from "@/lib/data/home";
import type { PublicSiteSettings } from "@/lib/types/content";

interface HomeProps {
  settings: PublicSiteSettings | null;
  projects: HomeProject[];
  experiences: HomeExperience[];
  skills: HomeSkill[];
  posts: HomePost[];
}

const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };

function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-link hover:underline"
      >
        {linkLabel} <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Hero({ settings }: { settings: PublicSiteSettings | null }) {
  const t = useTranslations("home");
  const tCv = useTranslations("cv");
  const locale = useLocale();
  const greeting = t("greeting");
  const name = stripGreeting(getTranslated(settings, "heroTitle", locale), greeting, locale);
  const role = getTranslated(settings, "heroSub", locale) || t("heroSub");
  const intro = getTranslated(settings, "heroIntro", locale);
  const cvUrl = cvUrlFor(settings, locale);
  const outline = buttonVariants({ variant: "outline", size: "lg" });

  return (
    <section
      aria-labelledby="hero-title"
      className="container mx-auto px-4 pt-16 pb-8 md:px-6 md:pt-24 md:pb-12"
    >
      <div className="enter max-w-3xl space-y-6">
        {/* Without a name in the settings the role is the title (no placeholder name). */}
        {name ? (
          <>
            <h1 id="hero-title" className="text-display text-balance">
              <span className="mb-2 block text-lead font-medium tracking-normal text-muted-foreground md:text-xl">
                {greeting}
              </span>
              <span className="text-link">{name}</span>
            </h1>
            <p className="text-h3 font-medium tracking-normal md:text-h2">{role}</p>
          </>
        ) : (
          <h1 id="hero-title" className="text-display text-balance">
            {role}
          </h1>
        )}
        {intro && (
          <p className="max-w-2xl text-lead text-pretty whitespace-pre-line text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/contact" className={buttonVariants({ size: "lg" })}>
            {t("heroCta")} <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
          </Link>
          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="document"
              className={outline}
            >
              <Download aria-hidden className="mr-1 h-4 w-4" /> {tCv("download")}
            </a>
          )}
          {settings?.socialGithub && (
            <a
              href={settings.socialGithub}
              target="_blank"
              rel="noopener noreferrer"
              className={outline}
            >
              <GithubIcon aria-hidden className="mr-1 h-4 w-4" /> GitHub
            </a>
          )}
          {settings?.socialLinkedin && (
            <a
              href={settings.socialLinkedin}
              target="_blank"
              rel="noopener noreferrer"
              className={outline}
            >
              <LinkedinIcon aria-hidden className="mr-1 h-4 w-4" /> LinkedIn
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function initials(title: string): string {
  const words = title.replace(/[-_]+/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : title.slice(0, 2)).toUpperCase();
}

function ProjectCover({
  project,
  title,
  wide,
}: {
  project: HomeProject;
  title: string;
  wide: boolean;
}) {
  const cover = project.cover;
  const language = project.primaryLanguage ?? null;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        wide ? "aspect-video md:aspect-auto md:h-full md:min-h-64" : "aspect-video",
      )}
    >
      {cover?.url ? (
        <Image
          src={cover.url}
          alt=""
          fill
          sizes={
            wide
              ? "(min-width: 768px) 55vw, 100vw"
              : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          }
          className={cover.fit === "contain" ? "object-contain p-8" : "object-cover"}
          {...(cover.blurDataUrl && cover.fit === "cover"
            ? { placeholder: "blur" as const, blurDataURL: cover.blurDataUrl }
            : {})}
        />
      ) : (
        <div aria-hidden className="flex h-full w-full flex-col items-center justify-center gap-2">
          <span className="text-4xl font-bold tracking-tight text-muted-foreground">
            {initials(title)}
          </span>
          {language && <span className="text-xs text-muted-foreground">{language}</span>}
        </div>
      )}
    </div>
  );
}

function Projects({ projects }: { projects: HomeProject[] }) {
  const t = useTranslations("home");
  const locale = useLocale();
  if (projects.length === 0) return null;
  const grid = projectGrid(projects.length);
  return (
    <section
      aria-labelledby="featured-projects"
      className="container mx-auto px-4 py-8 md:px-6 md:py-12"
    >
      <SectionHeading
        id="featured-projects"
        title={t("featuredProjects")}
        href="/projects"
        linkLabel={t("allProjects")}
      />
      <ul
        data-testid="home-projects"
        data-grid={grid}
        className={cn(
          "grid grid-cols-1 gap-6",
          grid === "two" && "md:grid-cols-2",
          grid === "three" && "lg:grid-cols-3",
        )}
      >
        {projects.map((project) => {
          const title = getTranslated(project, "title", locale);
          const wide = grid === "single";
          return (
            <li key={project.id} className="reveal">
              <article
                className={cn(
                  "group relative h-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40",
                  wide && "md:grid md:grid-cols-[1.2fr_1fr]",
                )}
              >
                <ProjectCover project={project} title={title} wide={wide} />
                <div className="space-y-3 p-6">
                  <h3 className="text-h3">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="group-hover:text-link after:absolute after:inset-0"
                    >
                      {title}
                    </Link>
                  </h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {getTranslated(project, "summary", locale)}
                  </p>
                  <TagChips
                    tags={project.tags.slice(0, 6)}
                    locale={locale}
                    chipClassName="text-xs"
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Experience({ experiences }: { experiences: HomeExperience[] }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const duration = useDurationLabel();
  if (experiences.length === 0) return null;
  return (
    <section
      aria-labelledby="experience-summary"
      className="container mx-auto px-4 py-8 md:px-6 md:py-12"
    >
      <SectionHeading
        id="experience-summary"
        title={t("experience")}
        href="/experience"
        linkLabel={t("allExperience")}
      />
      <ol className="relative space-y-8 border-l border-border pl-6">
        {experiences.map((exp) => {
          const location =
            (locale === "en" ? exp.locationEn : exp.locationTr) || exp.locationTr || exp.locationEn;
          return (
            <li key={exp.id} className="reveal relative">
              <span
                aria-hidden
                className="absolute top-2 -left-[29px] h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background"
              />
              <div className="flex gap-4">
                {exp.logoUrl ? (
                  <Image
                    src={exp.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground"
                  >
                    {exp.company.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 space-y-1">
                  <h3 className="text-h4">
                    <Link
                      href={`/experience/${exp.id}`}
                      className="hover:text-link hover:underline"
                    >
                      {getTranslated(exp, "position", locale)}
                    </Link>
                  </h3>
                  <p className="text-sm">{exp.company}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {formatDate(exp.startDate, locale, MONTH_YEAR)} –{" "}
                      {exp.endDate ? formatDate(exp.endDate, locale, MONTH_YEAR) : t("present")}
                      {" · "}
                      {duration(exp.months)}
                    </span>
                    {location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden className="h-4 w-4" /> {location}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Skills({ skills }: { skills: HomeSkill[] }) {
  const t = useTranslations("home");
  const locale = useLocale();
  if (skills.length === 0) return null;
  return (
    <section
      aria-labelledby="featured-skills"
      className="container mx-auto px-4 py-8 md:px-6 md:py-12"
    >
      <SectionHeading
        id="featured-skills"
        title={t("skills")}
        href="/skills"
        linkLabel={t("allSkills")}
      />
      <ul data-testid="home-skills" className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li key={skill.slug}>
            <Link
              href={`/skills/${skill.slug}`}
              className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-link"
            >
              {tagLabel(skill, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Posts({ posts }: { posts: HomePost[] }) {
  const t = useTranslations("home");
  const locale = useLocale();
  if (posts.length === 0) return null;
  return (
    <section
      aria-labelledby="latest-posts"
      className="container mx-auto px-4 py-8 md:px-6 md:py-12"
    >
      <SectionHeading
        id="latest-posts"
        title={t("latestPosts")}
        href="/blog"
        linkLabel={t("allPosts")}
      />
      <ul data-testid="home-posts" className="divide-y divide-border border-y border-border">
        {posts.map((post) => (
          <li key={post.id} className="reveal group relative py-6">
            <p className="mb-1 text-sm text-muted-foreground">
              <time dateTime={new Date(post.createdAt).toISOString()}>
                {formatDate(post.createdAt, locale)}
              </time>
              {" · "}
              {t("readingTime", { minutes: locale === "en" ? post.minutesEn : post.minutesTr })}
            </p>
            <h3 className="text-h3">
              <Link
                href={`/blog/${post.slug}`}
                className="group-hover:text-link after:absolute after:inset-0"
              >
                {getTranslated(post, "title", locale)}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {getTranslated(post, "excerpt", locale)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Home page: short hero, featured projects, experience, skills and the newest posts. */
export default function HomeClient({ settings, projects, experiences, skills, posts }: HomeProps) {
  return (
    <div className="pb-8 md:pb-12">
      <Hero settings={settings} />
      <Projects projects={projects} />
      <Experience experiences={experiences} />
      <Skills skills={skills} />
      <Posts posts={posts} />
    </div>
  );
}
