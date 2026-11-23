"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, ArrowRight, Calendar } from "lucide-react";
import { getTranslated } from "@/lib/i18n-utils";

import { Experience } from "@prisma/client";

interface ExperienceClientProps {
  experiences: (Experience & { tags: { id: string; nameTr: string; nameEn: string }[] })[];
}

export default function ExperienceClient({ experiences }: ExperienceClientProps) {
  const t = useTranslations("experience");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <Badge
            variant="secondary"
            className="mb-4 border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-violet-400"
          >
            <Briefcase className="mr-1 h-3 w-3" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">{t("title")}</h1>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-violet-500/50 via-cyan-500/50 to-transparent md:left-1/2 md:-translate-x-px" />

          <div className="space-y-12">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col gap-8 md:flex-row ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-0 z-10 h-4 w-4 -translate-x-[7px] rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 ring-4 ring-background md:left-1/2 md:-translate-x-2" />

                {/* Date */}
                <div
                  className={`pl-8 md:w-1/2 md:pl-0 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"}`}
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(exp.startDate)} —{" "}
                      {exp.endDate ? formatDate(exp.endDate) : t("present")}
                    </span>
                  </div>
                </div>

                {/* Card */}
                <div className={`pl-8 md:w-1/2 md:pl-0 ${i % 2 === 0 ? "md:pl-12" : "md:pr-12"}`}>
                  <Link href={`/experience/${exp.id}`}>
                    <Card className="group cursor-pointer border-border/50 bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:bg-card hover:shadow-lg hover:shadow-violet-500/5">
                      <CardContent className="space-y-3 p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold transition-colors group-hover:text-violet-400">
                              {exp.company}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {getTranslated(exp, "position", locale)}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-violet-400" />
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {getTranslated(exp, "description", locale)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {exp.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="bg-accent/50 text-xs"
                            >
                              {getTranslated(tag, "name", locale)}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
