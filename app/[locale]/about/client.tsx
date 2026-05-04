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
  Code2, Globe, Coffee, Heart, Palette, Bike, Plane, Leaf, Zap, Sparkles, Anchor, Sun, Moon,
  Cloud, Star, Umbrella, Tent, Mountain, Waves, Wind, Binary, Cpu, Database, Terminal, Braces, 
  Layout, Monitor, Smartphone, Tablet, Watch, Film, Headphones, Mic, Radio, Tv, Video, 
  Briefcase, GraduationCap, Library, School, University, Pizza, Utensils, Wine, Beer, Apple, 
  IceCream, Dumbbell, Trophy, Flag, Medal, Timer, MessageCircle, Mail, Phone, Share2, Users, 
  ShoppingBag, ShoppingCart, CreditCard, Wallet, Home, Building, Building2, Map, Navigation, 
  Pen, Pencil, Eraser, Brush, Scissors, Gift, Key, Lock, Unlock, Bell, Eye, Search
} from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon, InstagramIcon, YoutubeIcon, MediumIcon, StackOverflowIcon } from "@/components/icons";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

const ICONS: Record<string, any> = {
  Camera, Gamepad2, BookOpen, Music, Code2, Globe, Coffee, Heart, Palette, Bike, Plane, Leaf, 
  Zap, Sparkles, Anchor, Sun, Moon, Cloud, Star, Umbrella, Tent, Mountain, Waves, Wind, 
  Binary, Cpu, Database, Terminal, Braces, Layout, Monitor, Smartphone, Tablet, Watch, 
  Film, Headphones, Mic, Radio, Tv, Video, Briefcase, GraduationCap, Library, School, 
  University, Pizza, Utensils, Wine, Beer, Apple, IceCream, Dumbbell, Trophy, Flag, 
  Medal, Timer, MessageCircle, Mail, Phone, Share2, Users, ShoppingBag, ShoppingCart, 
  CreditCard, Wallet, Home, Building, Building2, Map, Navigation, Pen, Pencil, 
  Eraser, Brush, Scissors, Gift, Key, Lock, Unlock, Bell, Eye, Search
};

interface AboutClientProps {
  settings: any;
}

export default function AboutClient({ settings }: AboutClientProps) {
  const t = useTranslations("about");
  const params = useParams();
  const locale = params.locale as string;

  const skills = Array.isArray(settings?.skills) && settings.skills.length > 0 
    ? settings.skills.map((s: any) => ({
        name: getTranslated(s, "name", locale),
        level: s.level
      }))
    : [
        { name: "JavaScript / TypeScript", level: 95 },
        { name: "React / Next.js", level: 92 },
        { name: "Node.js / Express", level: 88 }
      ];

  const hobbies = Array.isArray(settings?.hobbies) && settings.hobbies.length > 0
    ? settings.hobbies.map((h: any) => ({
        icon: h.icon,
        name: getTranslated(h, "name", locale),
        desc: getTranslated(h, "desc", locale)
      }))
    : [
        { icon: "Camera", name: "Fotoğrafçılık", desc: "Doğa ve sokak fotoğrafçılığı" }
      ];

  const bioHtml = getTranslated(settings, "aboutBio", locale) || `
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
              {getTranslated(settings, "heroTitle", locale).replace("Merhaba, Ben ", "").replace("Hello, I am ", "") || "Demircucu"}
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {getTranslated(settings, "heroSub", locale) || "Yazılım mühendisi olarak modern web teknolojileri ile çalışıyorum."}
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
            <div className="md:float-left md:mr-10 md:mb-8 mb-10 flex justify-center md:block">
              <div className="relative">
                <div className="w-64 h-64 md:w-72 md:h-72 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden border border-border/50 shadow-2xl">
                  {settings?.aboutPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.aboutPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👨‍💻</span>
                  )}
                </div>
                <div className="absolute -bottom-3 -right-3 w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg">
                  <Globe className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Bio content */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                {t("bio")}
              </h2>
              <div 
                className="text-muted-foreground leading-relaxed prose prose-invert max-w-none prose-p:mb-4"
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />
              
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm md:text-base text-muted-foreground">
                  <MapPin className="h-4 w-4 text-violet-400" />
                  <span>{getTranslated(settings, "aboutLocation", locale) || "İstanbul, Türkiye"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm md:text-base text-muted-foreground">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span>{getTranslated(settings, "aboutExperience", locale) || "5+ Yıl Deneyim"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                {settings?.socialGithub && (
                  <a href={settings.socialGithub} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-violet-500/20">
                      <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                    </Button>
                  </a>
                )}
                {!settings?.socialGithub && (
                  <a href="https://github.com/demircucu" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-violet-500/20">
                      <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                    </Button>
                  </a>
                )}
                
                {settings?.socialLinkedin && (
                  <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><LinkedinIcon className="mr-2 h-4 w-4" /> LinkedIn</Button>
                  </a>
                )}
                {settings?.socialTwitter && (
                  <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><TwitterIcon className="mr-2 h-4 w-4" /> Twitter / X</Button>
                  </a>
                )}
                {settings?.socialInstagram && (
                  <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><InstagramIcon className="mr-2 h-4 w-4" /> Instagram</Button>
                  </a>
                )}
                {settings?.socialYoutube && (
                  <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><YoutubeIcon className="mr-2 h-4 w-4" /> YouTube</Button>
                  </a>
                )}
                {settings?.socialMedium && (
                  <a href={settings.socialMedium} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><MediumIcon className="mr-2 h-4 w-4" /> Medium</Button>
                  </a>
                )}
                {settings?.socialStackoverflow && (
                  <a href={settings.socialStackoverflow} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5"><StackOverflowIcon className="mr-2 h-4 w-4" /> StackOverflow</Button>
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
                  <Card className="border-border/50 bg-card/50 hover:bg-card hover:border-violet-500/30 transition-all duration-300 group h-full">
                    <CardContent className="p-6 text-center space-y-3 flex flex-col items-center justify-center h-full">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 group-hover:scale-110 transition-transform mb-2">
                        {IconComponent ? (
                          <IconComponent className="h-6 w-6 text-violet-400" />
                        ) : (
                          <span className="text-2xl leading-none">{hobby.icon || "❤️"}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm md:text-base">{hobby.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{hobby.desc}</p>
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
