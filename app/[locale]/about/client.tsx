import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader, PageShell, SectionHeading } from "@/components/layout/page-header";
import { Prose } from "@/components/prose";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cvUrlFor } from "@/lib/cv";
import {
  Download,
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
import type { LucideIcon } from "lucide-react";
import type { PublicSiteSettings } from "@/lib/types/content";
import type { HobbySetting } from "@/lib/types/content";
import { Link } from "@/i18n/navigation";
import type { SkillForest } from "@/lib/tags/tree";
import { SkillForestView } from "@/components/tags/skill-forest";

const ICONS: Record<string, LucideIcon> = {
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
  settings: PublicSiteSettings | null;
  skillForest: SkillForest;
}

export default function AboutClient({ settings, skillForest }: AboutClientProps) {
  const t = useTranslations("about");
  const tCv = useTranslations("cv");
  const locale = useLocale();
  const cvUrl = cvUrlFor(settings, locale);

  const hobbies =
    Array.isArray(settings?.hobbies) && settings.hobbies.length > 0
      ? (settings.hobbies as unknown as HobbySetting[]).map((h) => ({
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
    <PageShell>
      <PageHeader
        eyebrow={t("title")}
        title={
          <>
            {t("heroTitle")}{" "}
            <span className="text-link">
              {getTranslated(settings, "heroTitle", locale) || "Demircucu"}
            </span>
          </>
        }
        lead={
          getTranslated(settings, "heroSub", locale) ||
          "Yazılım mühendisi olarak modern web teknolojileri ile çalışıyorum."
        }
      />

      {/* Bio Section */}
      <section className="reveal mb-16 md:mb-24">
        <div className="flow-root">
          {/* Photo */}
          <div className="mb-10 flex justify-center md:float-left md:mr-10 md:mb-0 md:block">
            <div className="relative">
              <div className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-2xl md:h-72 md:w-72">
                {settings?.aboutPhotoUrl ? (
                  <Image
                    src={settings.aboutPhotoUrl}
                    alt={t("photoAlt")}
                    fill
                    sizes="(min-width: 768px) 288px, 256px"
                    preload
                    {...(settings.aboutPhotoBlur
                      ? { placeholder: "blur" as const, blurDataURL: settings.aboutPhotoBlur }
                      : {})}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-6xl">👨‍💻</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio content */}
          <div>
            <SectionHeading>{t("bio")}</SectionHeading>
            <Prose html={bioHtml} />

            <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                <MapPin className="h-4 w-4 text-link" />
                <span>
                  {getTranslated(settings, "aboutLocation", locale) || "İstanbul, Türkiye"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground md:text-base">
                <Calendar className="h-4 w-4 text-link" />
                <span>
                  {getTranslated(settings, "aboutExperience", locale) || "5+ Yıl Deneyim"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="document"
                  className={buttonVariants({
                    variant: "outline",
                    className: "border-border/50 hover:border-primary/40 hover:bg-accent",
                  })}
                >
                  <Download aria-hidden className="mr-2 h-4 w-4" /> {tCv("download")}
                </a>
              )}
              {settings?.socialGithub && (
                <a href={settings.socialGithub} target="_blank" rel="noopener noreferrer">
                  <Button className="border-0 bg-primary text-primary-foreground shadow-lg">
                    <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                  </Button>
                </a>
              )}
              {!settings?.socialGithub && (
                <a href="https://github.com/demircucu" target="_blank" rel="noopener noreferrer">
                  <Button className="border-0 bg-primary text-primary-foreground shadow-lg">
                    <GithubIcon className="mr-2 h-4 w-4" /> {t("github")}
                  </Button>
                </a>
              )}

              {settings?.socialLinkedin && (
                <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <LinkedinIcon className="mr-2 h-4 w-4" /> LinkedIn
                  </Button>
                </a>
              )}
              {settings?.socialTwitter && (
                <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <TwitterIcon className="mr-2 h-4 w-4" /> Twitter / X
                  </Button>
                </a>
              )}
              {settings?.socialInstagram && (
                <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <InstagramIcon className="mr-2 h-4 w-4" /> Instagram
                  </Button>
                </a>
              )}
              {settings?.socialYoutube && (
                <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <YoutubeIcon className="mr-2 h-4 w-4" /> YouTube
                  </Button>
                </a>
              )}
              {settings?.socialMedium && (
                <a href={settings.socialMedium} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <MediumIcon className="mr-2 h-4 w-4" /> Medium
                  </Button>
                </a>
              )}
              {settings?.socialStackoverflow && (
                <a href={settings.socialStackoverflow} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-border/50 hover:border-primary/40 hover:bg-accent"
                  >
                    <StackOverflowIcon className="mr-2 h-4 w-4" /> StackOverflow
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="reveal mb-16 md:mb-24">
        <SectionHeading icon={Code2}>{t("skills")}</SectionHeading>
        <SkillForestView forest={skillForest} locale={locale} headingLevel="h3" />
        <Link
          href="/skills"
          className="mt-6 inline-flex items-center text-sm font-medium text-link hover:underline"
        >
          {t("allSkills")}
        </Link>
      </section>

      {/* Hobbies */}
      <section className="reveal">
        <SectionHeading icon={Gamepad2}>{t("hobbies")}</SectionHeading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {hobbies.map((hobby) => {
            const IconComponent = hobby.icon ? ICONS[hobby.icon] : undefined;

            return (
              <div key={hobby.name} className="reveal enter-scale">
                <Card className="group h-full border-border/50 bg-card/50 transition-all duration-300 hover:border-primary/40 hover:bg-card">
                  <CardContent className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-transform group-hover:scale-110">
                      {IconComponent ? (
                        <IconComponent className="h-6 w-6 text-link" />
                      ) : (
                        <span className="text-2xl leading-none">{hobby.icon || "❤️"}</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold">{hobby.name}</h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{hobby.desc}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
