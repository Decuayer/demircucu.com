"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { TagChips } from "@/components/tags/tag-chips";
import { useDurationLabel } from "@/components/experience/duration";
import { TextBlocks } from "@/components/experience/text-blocks";
import { isoMonth } from "@/lib/experience/duration";
import { formatDate } from "@/lib/format-date";
import { getTranslated } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import type { getPublishedExperiences } from "@/lib/data/experiences";

export type TimelineExperience = Awaited<ReturnType<typeof getPublishedExperiences>>[number];

export interface ExperienceClientProps {
  experiences: TimelineExperience[];
  /** Active tag filter bar (from the filtered wrapper). */
  filter?: React.ReactNode;
}

const MONTH_YEAR: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };

/**
 * Experience timeline (phase 8): one column at every width, newest first. Each entry has a meta
 * column (dates, length, location; above the card on phones), a rail with a dot (filled for an
 * ongoing role) and the card.
 */
export default function ExperienceClient({ experiences, filter }: ExperienceClientProps) {
  const t = useTranslations("experience");
  const locale = useLocale();
  const duration = useDurationLabel();

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <div className="enter mb-12 text-center md:mb-16">
          <Badge
            variant="secondary"
            className="mb-4 border-primary/40 bg-muted px-4 py-1.5 text-link"
          >
            <Briefcase aria-hidden className="mr-1 h-3 w-3" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">{t("title")}</h1>
        </div>

        {filter}

        <ol data-testid="experience-timeline" aria-label={t("title")}>
          {experiences.map((exp, i) => {
            const ongoing = !exp.endDate;
            const last = i === experiences.length - 1;
            const location =
              (locale === "en" ? exp.locationEn : exp.locationTr) ||
              exp.locationTr ||
              exp.locationEn;
            return (
              <li
                key={exp.id}
                data-testid="experience-entry"
                className="reveal grid grid-cols-[1rem_minmax(0,1fr)] gap-x-4 md:grid-cols-[12rem_1rem_minmax(0,1fr)] md:gap-x-6"
              >
                {/* Meta: dates, length, location. */}
                <div className="col-start-2 row-start-1 space-y-1 pb-3 text-sm text-muted-foreground md:col-start-1 md:pt-0.5 md:pb-10 md:text-right">
                  <p className="font-medium text-foreground">
                    <time dateTime={isoMonth(exp.startDate)}>
                      {formatDate(exp.startDate, locale, MONTH_YEAR)}
                    </time>
                    {" – "}
                    {exp.endDate ? (
                      <time dateTime={isoMonth(exp.endDate)}>
                        {formatDate(exp.endDate, locale, MONTH_YEAR)}
                      </time>
                    ) : (
                      <span>{t("present")}</span>
                    )}
                  </p>
                  <p data-testid="experience-duration">
                    <span className="sr-only">{t("duration")}: </span>
                    {duration(exp.months)}
                  </p>
                  {location && (
                    <p>
                      <MapPin aria-hidden className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />
                      <span className="sr-only">{t("location")}: </span>
                      {location}
                    </p>
                  )}
                </div>

                {/* Rail and dot. */}
                <div
                  aria-hidden
                  className="col-start-1 row-span-2 row-start-1 flex flex-col items-center md:col-start-2 md:row-span-1"
                >
                  <span
                    className={cn(
                      "mt-1 h-3.5 w-3.5 shrink-0 rounded-full",
                      ongoing
                        ? "bg-primary ring-4 ring-primary/25"
                        : "border-2 border-primary bg-background",
                    )}
                  />
                  {!last && <span className="mt-2 w-px flex-1 bg-border" />}
                </div>

                {/* Card. */}
                <div className="col-start-2 row-start-2 pb-10 md:col-start-3 md:row-start-1">
                  <article className="group relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 md:p-6">
                    <div className="flex items-start gap-3">
                      {exp.logoUrl ? (
                        <Image
                          src={exp.logoUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background object-contain p-1"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground"
                        >
                          {exp.company.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg leading-snug font-semibold">
                          <Link
                            href={`/experience/${exp.id}`}
                            className="group-hover:text-link after:absolute after:inset-0 after:rounded-xl"
                          >
                            {getTranslated(exp, "position", locale)}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                      </div>
                      {ongoing && (
                        <Badge
                          variant="secondary"
                          className="hidden shrink-0 border-primary/40 bg-muted text-link sm:inline-flex"
                        >
                          {t("present")}
                        </Badge>
                      )}
                      <ArrowRight
                        aria-hidden
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-link"
                      />
                    </div>
                    <TextBlocks text={getTranslated(exp, "description", locale)} className="mt-4" />
                    <TagChips
                      tags={exp.tags}
                      locale={locale}
                      className="mt-4"
                      chipClassName="text-xs"
                    />
                  </article>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
