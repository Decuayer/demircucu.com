"use client";

import type { PublicSiteSettings } from "@/lib/types/content";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail } from "lucide-react";
import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
  InstagramIcon,
  YoutubeIcon,
  MediumIcon,
  StackOverflowIcon,
} from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { getTranslated } from "@/lib/i18n-utils";

const footerLinks = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/projects", key: "projects" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

interface FooterProps {
  settings?: PublicSiteSettings | null;
  /** Passed from a cached server value; never `new Date()` during render (static shell). */
  year: number;
}

export default function Footer({ settings, year }: FooterProps) {
  const t = useTranslations("nav");
  const locale = useLocale();

  const socialLinks = [];
  if (settings?.socialGithub)
    socialLinks.push({ icon: GithubIcon, href: settings.socialGithub, label: "GitHub" });
  if (settings?.socialLinkedin)
    socialLinks.push({ icon: LinkedinIcon, href: settings.socialLinkedin, label: "LinkedIn" });
  if (settings?.socialTwitter)
    socialLinks.push({ icon: TwitterIcon, href: settings.socialTwitter, label: "Twitter" });
  if (settings?.socialInstagram)
    socialLinks.push({ icon: InstagramIcon, href: settings.socialInstagram, label: "Instagram" });
  if (settings?.socialYoutube)
    socialLinks.push({ icon: YoutubeIcon, href: settings.socialYoutube, label: "YouTube" });
  if (settings?.socialMedium)
    socialLinks.push({ icon: MediumIcon, href: settings.socialMedium, label: "Medium" });
  if (settings?.socialStackoverflow)
    socialLinks.push({
      icon: StackOverflowIcon,
      href: settings.socialStackoverflow,
      label: "StackOverflow",
    });

  if (settings?.contactEmail) {
    socialLinks.push({ icon: Mail, href: `mailto:${settings.contactEmail}`, label: "Email" });
  } else {
    socialLinks.push({ icon: Mail, href: "mailto:info@demircucu.com", label: "Email" });
  }

  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="container mx-auto px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">
              {getTranslated(settings, "footerTitle", locale) || "demircucu.com"}
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">
              {getTranslated(settings, "footerDescription", locale) ||
                "Full-Stack Developer & Software Engineer. Yazılım, projeler ve teknoloji dünyasından yazılar."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              {t("fastlinks")}
            </h3>
            <nav className="flex flex-col gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              {t("socialmedia")}
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/50 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8 opacity-50" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <p>
            © {year} demircucu.com. {t("copyright") || "Tüm hakları saklıdır."}
          </p>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
