"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Camera,
  Gamepad2,
  BookOpen,
  Music,
  Code2,
  Globe,
  Coffee,
  Heart
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

const ICONS: Record<string, any> = {
  Camera, Gamepad2, BookOpen, Music, Code2, Globe, Coffee, Heart
};

interface AboutClientProps {
  settings: any;
}

export default function AboutClient({ settings }: AboutClientProps) {
  const t = useTranslations("about");

  const skills = Array.isArray(settings?.skills) && settings.skills.length > 0 
    ? settings.skills 
    : [
        { name: "JavaScript / TypeScript", level: 95 },
        { name: "React / Next.js", level: 92 },
        { name: "Node.js / Express", level: 88 }
      ];

  const hobbies = Array.isArray(settings?.hobbies) && settings.hobbies.length > 0
    ? settings.hobbies
    : [
        { icon: "Camera", name: "Fotoğrafçılık", desc: "Doğa ve sokak fotoğrafçılığı" }
      ];

  const bioHtml = settings?.aboutBio || `
    <p>Yazılım dünyasına olan tutkumla, kullanıcı deneyimini ön planda tutan modern web uygulamaları geliştiriyorum. Next.js, TypeScript ve bulut teknolojileri konusunda uzmanlaşmış bir Full-Stack Geliştirici olarak çalışıyorum.</p>
    <p>Performans odaklı, ölçeklenebilir ve sürdürülebilir çözümler üretmeye önem veriyorum.</p>
  `;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
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
            {t("title")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Merhaba, Ben{" "}
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
              {settings?.heroTitle?.replace("Merhaba, Ben ", "") || "Demircucu"}
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {settings?.heroSub || "Yazılım mühendisi olarak modern web teknolojileri ile çalışıyorum."}
          </p>
        </motion.div>

        {/* Bio Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            {/* Photo placeholder */}
            <div className="md:col-span-2 flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden border border-border/50">
                  {settings?.aboutPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.aboutPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👨‍💻</span>
                  )}
                </div>
                <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg">
                  <Globe className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Bio text */}
            <div className="md:col-span-3 space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {t("bio")}
              </h2>
              <div 
                className="space-y-3 text-muted-foreground leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{settings?.aboutLocation || "İstanbul, Türkiye"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{settings?.aboutExperience || "5+ Yıl Deneyim"}</span>
                </div>
              </div>
              <a
                href={settings?.socialGithub || "https://github.com/demircucu"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="mt-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0">
                  <GithubIcon className="mr-2 h-4 w-4" />
                  {t("github")}
                </Button>
              </a>
            </div>
          </div>
        </motion.section>

        {/* Skills */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10">
              <Code2 className="h-5 w-5 text-cyan-400" />
            </div>
            {t("skills")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill: any, i: number) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{skill.name}</span>
                  <span className="text-muted-foreground">{skill.level}%</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.level}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Hobbies */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
              <Gamepad2 className="h-5 w-5 text-violet-400" />
            </div>
            {t("hobbies")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {hobbies.map((hobby: any, i: number) => {
              const IconComponent = ICONS[hobby.icon] || Heart;
              return (
                <motion.div
                  key={hobby.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all duration-300 group">
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 mx-auto group-hover:scale-110 transition-transform">
                        <IconComponent className="h-6 w-6 text-violet-400" />
                      </div>
                      <h3 className="font-semibold">{hobby.name}</h3>
                      <p className="text-xs text-muted-foreground">{hobby.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
