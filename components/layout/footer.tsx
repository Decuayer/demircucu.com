"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon, InstagramIcon, YoutubeIcon, MediumIcon, StackOverflowIcon } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { getTranslated } from "@/lib/i18n-utils";
import { useParams } from "next/navigation";

const footerLinks = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/projects", key: "projects" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

export default function Footer({ settings }: { settings?: any }) {
  const t = useTranslations("nav");
  const params = useParams();
  const locale = params.locale as string;

  const socialLinks = [];
  if (settings?.socialGithub) socialLinks.push({ icon: GithubIcon, href: settings.socialGithub, label: "GitHub" });
  if (settings?.socialLinkedin) socialLinks.push({ icon: LinkedinIcon, href: settings.socialLinkedin, label: "LinkedIn" });
  if (settings?.socialTwitter) socialLinks.push({ icon: TwitterIcon, href: settings.socialTwitter, label: "Twitter" });
  if (settings?.socialInstagram) socialLinks.push({ icon: InstagramIcon, href: settings.socialInstagram, label: "Instagram" });
  if (settings?.socialYoutube) socialLinks.push({ icon: YoutubeIcon, href: settings.socialYoutube, label: "YouTube" });
  if (settings?.socialMedium) socialLinks.push({ icon: MediumIcon, href: settings.socialMedium, label: "Medium" });
  if (settings?.socialStackoverflow) socialLinks.push({ icon: StackOverflowIcon, href: settings.socialStackoverflow, label: "StackOverflow" });
  
  if (settings?.contactEmail) {
    socialLinks.push({ icon: Mail, href: `mailto:${settings.contactEmail}`, label: "Email" });
  } else {
    socialLinks.push({ icon: Mail, href: "mailto:info@demircucu.com", label: "Email" });
  }

  return (
    <footer className="border-t border-border/40 bg-background/50">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <span className="text-lg font-bold bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
              {getTranslated(settings, "footerTitle", locale) || "demircucu.com"}
            </span>
            <p className="text-sm text-muted-foreground max-w-xs">
              {getTranslated(settings, "footerDescription", locale) || "Full-Stack Developer & Software Engineer. Yazılım, projeler ve teknoloji dünyasından yazılar."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("fastlinks")}
            </h3>
            <nav className="flex flex-col gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("socialmedia")}
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8 opacity-50" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} demircucu.com. {t("copyright") || "Tüm hakları saklıdır."}</p>
        </div>
      </div>
    </footer>
  );
}
