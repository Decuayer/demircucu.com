"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, ArrowRight, Calendar } from "lucide-react";

import { Experience } from "@prisma/client";

interface ExperienceClientProps {
  experiences: (Experience & { tags: { name: string }[] })[];
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
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-violet-500/10 text-violet-400 border-violet-500/20"
          >
            <Briefcase className="h-3 w-3 mr-1" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold">
            {t("title")}
          </h1>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-cyan-500/50 to-transparent md:-translate-x-px" />

          <div className="space-y-12">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col md:flex-row gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-0 md:left-1/2 w-4 h-4 -translate-x-[7px] md:-translate-x-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 ring-4 ring-background z-10" />

                {/* Date */}
                <div className={`md:w-1/2 pl-8 md:pl-0 ${i % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(exp.startDate)} — {exp.endDate ? formatDate(exp.endDate) : t("present")}
                    </span>
                  </div>
                </div>

                {/* Card */}
                <div className={`md:w-1/2 pl-8 md:pl-0 ${i % 2 === 0 ? "md:pl-12" : "md:pr-12"}`}>
                  <Link href={`/experience/${exp.id}`}>
                    <Card className="group border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer">
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-violet-400 transition-colors">
                              {exp.company}
                            </h3>
                            <p className="text-sm text-muted-foreground">{exp.position}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {exp.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {exp.tags.map((tag) => (
                            <Badge
                              key={tag.name}
                              variant="secondary"
                              className="text-xs bg-accent/50"
                            >
                              {tag.name}
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
