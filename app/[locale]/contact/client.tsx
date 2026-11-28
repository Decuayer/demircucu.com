"use client";

import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { PublicSiteSettings } from "@/lib/types/content";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
  InstagramIcon,
  YoutubeIcon,
  MediumIcon,
  StackOverflowIcon,
} from "@/components/icons";
import { useState } from "react";
import { toast } from "sonner";
import { submitContactMessage } from "@/app/actions/contact";

interface ContactClientProps {
  settings: PublicSiteSettings | null;
}

export default function ContactClient({ settings }: ContactClientProps) {
  const t = useTranslations("contact");
  const [loading, setLoading] = useState(false);
  const errorMessage = useActionErrorMessage();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const website = formData.get("website") as string;

    const res = await submitContactMessage({ name, email, subject, message, website });

    setLoading(false);

    if (res.error) {
      toast.error(errorMessage(res.error));
    } else {
      toast.success(t("success") || "Mesajınız başarıyla gönderildi!");
      (e.target as HTMLFormElement).reset();
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: settings?.contactEmail || "info@demircucu.com",
      href: `mailto:${settings?.contactEmail || "info@demircucu.com"}`,
    },
    {
      icon: MapPin,
      label: "Konum",
      value: settings?.contactAddress || "İstanbul, Türkiye",
      href: null,
    },
    {
      icon: Phone,
      label: "Telefon",
      value: settings?.contactPhone || "+90 (5XX) XXX XX XX",
      href: null,
    },
  ];

  const socialLinks = [];
  if (settings?.socialGithub)
    socialLinks.push({ icon: GithubIcon, label: "GitHub", href: settings.socialGithub });
  if (settings?.socialLinkedin)
    socialLinks.push({ icon: LinkedinIcon, label: "LinkedIn", href: settings.socialLinkedin });
  if (settings?.socialTwitter)
    socialLinks.push({ icon: TwitterIcon, label: "Twitter / X", href: settings.socialTwitter });
  if (settings?.socialInstagram)
    socialLinks.push({ icon: InstagramIcon, label: "Instagram", href: settings.socialInstagram });
  if (settings?.socialYoutube)
    socialLinks.push({ icon: YoutubeIcon, label: "YouTube", href: settings.socialYoutube });
  if (settings?.socialMedium)
    socialLinks.push({ icon: MediumIcon, label: "Medium", href: settings.socialMedium });
  if (settings?.socialStackoverflow)
    socialLinks.push({
      icon: StackOverflowIcon,
      label: "StackOverflow",
      href: settings.socialStackoverflow,
    });

  return (
    <PageShell>
      <PageHeader eyebrow={t("title")} icon={Mail} title={t("title")} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Contact Form */}
        <div className="reveal enter-from-left lg:col-span-3">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot: invisible to people and screen readers, filled by naive bots. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      className="bg-accent/30"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="bg-accent/30"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">{t("subject")}</Label>
                  <Input
                    id="subject"
                    name="subject"
                    className="bg-accent/30"
                    placeholder="Proje hakkında..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{t("message")}</Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="resize-none bg-accent/30"
                    placeholder="Mesajınızı buraya yazın..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full border-0 bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <span className="animate-pulse">Gönderiliyor...</span>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("send")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <div className="reveal enter-from-right space-y-6 lg:col-span-2">
          {/* Info Cards */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-6 p-6">
              <h2 className="text-h4">{t("info")}</h2>
              <div className="space-y-4">
                {contactInfo.map((info) => (
                  <div key={info.label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <info.icon className="h-5 w-5 text-link" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{info.label}</p>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="text-sm font-medium transition-colors hover:text-link"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{info.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-h4">{t("social")}</h2>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50 text-muted-foreground transition-all hover:scale-105 hover:bg-accent hover:text-foreground"
                      aria-label={social.label}
                    >
                      <social.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
