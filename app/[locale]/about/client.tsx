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
  Heart,
  Palette,
  Bike,
  Plane,
  Leaf,
  Zap,
  Sparkles,
  Anchor,
  Sun,
  Moon,
  Cloud,
  Star,
  Umbrella,
  Tent,
  Mountain,
  Waves,
  Wind,
  Binary,
  Cpu,
  Database,
  Terminal,
  Braces,
  Layout,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Film,
  Headphones,
  Mic,
  Radio,
  Tv,
  Video,
  Briefcase,
  GraduationCap,
  Library,
  School,
  University,
  Pizza,
  Utensils,
  Wine,
  Beer,
  Apple,
  IceCream,
  Dumbbell,
  Trophy,
  Flag,
  Medal,
  Timer,
  MessageCircle,
  Mail,
  Phone,
  Share2,
  Users,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Wallet,
  Home,
  Building,
  Building2,
  Map,
  Navigation,
  Pen,
  Pencil,
  Eraser,
  Brush,
  Scissors,
  Gift,
  Key,
  Lock,
  Unlock,
  Bell,
  Eye,
  Search,
} from "lucide-react";
import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
  InstagramIcon,
  YoutubeIcon,
  MediumIcon,
  StackOverflowIcon,
} from "@/components/icons";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

const ICONS: Record<string, any> = {
  Camera,
  Gamepad2,
  BookOpen,
  Music,
  Code2,
  Globe,
  Coffee,
  Heart,
  Palette,
  Bike,
  Plane,
  Leaf,
  Zap,
  Sparkles,
  Anchor,
  Sun,
  Moon,
  Cloud,
  Star,
  Umbrella,
  Tent,
  Mountain,
  Waves,
  Wind,
  Binary,
  Cpu,
  Database,
  Terminal,
  Braces,
  Layout,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Film,
  Headphones,
  Mic,
  Radio,
  Tv,
  Video,
  Briefcase,
  GraduationCap,
  Library,
  School,
  University,
  Pizza,
  Utensils,
  Wine,
  Beer,
  Apple,
  IceCream,
  Dumbbell,
  Trophy,
  Flag,
  Medal,
  Timer,
  MessageCircle,
  Mail,
  Phone,
  Share2,
  Users,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Wallet,
  Home,
  Building,
  Building2,
  Map,
  Navigation,
  Pen,
  Pencil,
  Eraser,
  Brush,
  Scissors,
  Gift,
  Key,
  Lock,
  Unlock,
  Bell,
  Eye,
  Search,
};

interface AboutClientProps {
  settings: any;
}

export default function AboutClient({ settings }: AboutClientProps) {
  const t = useTranslations("about");
  const params = useParams();
  const locale = params.locale as string;

  const skills =
    Array.isArray(settings?.skills) && settings.skills.length > 0
      ? settings.skills.map((s: any) => ({
          name: getTranslated(s, "name", locale),
          level: s.level,
        }))
      : [
          { name: "JavaScript / TypeScript", level: 95 },
          { name: "React / Next.js", level: 92 },
          { name: "Node.js / Express", level: 88 },
        ];

  const hobbies =
    Array.isArray(settings?.hobbies) && settings.hobbies.length > 0
      ? settings.hobbies.map((h: any) => ({
          icon: h.icon,
          name: getTranslated(h, "name", locale),
          desc: getTranslated(h, "desc", locale),
        }))
      : [{ icon: "Camera", name: "Fotoğrafçılık", desc: "Doğa ve sokak fotoğrafçılığı" }];

  const bioHtml =
    getTranslated(settings, "aboutBio", locale) ||
    `
    <p>Yazılım dünyasına olan tutkumla, kullanıcı deneyimini ön planda tutan modern web uygulamaları geliştiriyorum. Next.js, TypeScript ve bulut teknolojileri konusunda uzmanlaşmış bir Full-Stack Geliştirici olarak çalışıyorum.</p>
    <p>Performans odaklı, ölçeklenebilir ve sürdürülebilir çözümler üretmeye önem veriyorum.</p>
  `;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
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
            {t("title")}
          </Badge>
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            {t("heroTitle")}{" "}
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
              {getTranslated(settings, "heroTitle", locale) || (
                <>
                  <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                    Demircucu
                  </span>
                </>
              )}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {getTranslated(settings, "heroSub", locale) ||
              "Yazılım mühendisi olarak modern web teknolojileri ile çalışıyorum."}
          </p>
        </motion.div>

        {/* Bio Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="block">
            {/* Photo */}
            <div className="mb-10 flex justify-center md:float-left md:mr-10 md:mb-8 md:block">
              <div className="relative">
                <div className="flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 shadow-2xl md:h-72 md:w-72">
                  {settings?.aboutPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.aboutPhoto}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">👨‍💻</span>
                  )}
                </div>
                <div className="absolute -right-3 -bottom-3 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 shadow-lg md:h-20 md:w-20">
                  <Globe className="h-6 w-6 text-white md:h-8 md:w-8" />
                </div>
              </div>
            </div>

            {/* Bio content */}
            <div className="space-y-6">
              <h2 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">{t("bio")}</h2>
              <div
                className="prose max-w-none leading-relaxed text-muted-foreground prose-invert prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />

              <div className="flex flex-wrap items-center gap-6 border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                  <MapPin className="h-4 w-4 text-violet-400" />
                  <span>
                    {getTranslated(settings, "aboutLocation", locale) || "İstanbul, Türkiye"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span>
                    {getTranslated(settings, "aboutExperience", locale) || "5+ Yıl Deneyim"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {settings?.socialGithub && (
                  <a href={settings.socialGithub} target="_blank" rel="noopener noreferrer">
                    <Button className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-cyan-700">
                      <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                    </Button>
                  </a>
                )}
                {!settings?.socialGithub && (
                  <a href="https://github.com/demircucu" target="_blank" rel="noopener noreferrer">
                    <Button className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-cyan-700">
                      <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                    </Button>
                  </a>
                )}

                {settings?.socialLinkedin && (
                  <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <LinkedinIcon className="mr-2 h-4 w-4" /> LinkedIn
                    </Button>
                  </a>
                )}
                {settings?.socialTwitter && (
                  <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <TwitterIcon className="mr-2 h-4 w-4" /> Twitter / X
                    </Button>
                  </a>
                )}
                {settings?.socialInstagram && (
                  <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <InstagramIcon className="mr-2 h-4 w-4" /> Instagram
                    </Button>
                  </a>
                )}
                {settings?.socialYoutube && (
                  <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <YoutubeIcon className="mr-2 h-4 w-4" /> YouTube
                    </Button>
                  </a>
                )}
                {settings?.socialMedium && (
                  <a href={settings.socialMedium} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <MediumIcon className="mr-2 h-4 w-4" /> Medium
                    </Button>
                  </a>
                )}
                {settings?.socialStackoverflow && (
                  <a href={settings.socialStackoverflow} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"
                    >
                      <StackOverflowIcon className="mr-2 h-4 w-4" /> StackOverflow
                    </Button>
                  </a>
                )}
              </div>
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
          <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Code2 className="h-5 w-5 text-cyan-400" />
            </div>
            {t("skills")}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="h-2 overflow-hidden rounded-full bg-accent">
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
          <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Gamepad2 className="h-5 w-5 text-violet-400" />
            </div>
            {t("hobbies")}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {hobbies.map((hobby: any, i: number) => {
              const IconComponent = ICONS[hobby.icon];
              // If it's a single character or short string, it's likely an emoji
              const isEmoji = !IconComponent && hobby.icon?.length <= 4;

              return (
                <motion.div
                  key={hobby.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:bg-card">
                    <CardContent className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 transition-transform group-hover:scale-110">
                        {IconComponent ? (
                          <IconComponent className="h-6 w-6 text-violet-400" />
                        ) : (
                          <span className="text-2xl leading-none">{hobby.icon || "❤️"}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold md:text-base">{hobby.name}</h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{hobby.desc}</p>
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
