"use client";

import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { SiteSettings } from "@prisma/client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
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
  settings: SiteSettings | null;
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
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <Badge
            variant="secondary"
            className="mb-4 border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-violet-400"
          >
            <Mail className="mr-1 h-3 w-3" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl font-bold md:text-5xl">{t("title")}</h1>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3"
          >
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Honeypot: invisible to people and screen readers, filled by naive bots. */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                  >
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
                        className="border-border/50 bg-accent/30"
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
                        className="border-border/50 bg-accent/30"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("subject")}</Label>
                    <Input
                      id="subject"
                      name="subject"
                      className="border-border/50 bg-accent/30"
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
                      className="resize-none border-border/50 bg-accent/30"
                      placeholder="Mesajınızı buraya yazın..."
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700"
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
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6 lg:col-span-2"
          >
            {/* Info Cards */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="space-y-6 p-6">
                <h3 className="text-lg font-semibold">{t("info")}</h3>
                <div className="space-y-4">
                  {contactInfo.map((info) => (
                    <div key={info.label} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                        <info.icon className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{info.label}</p>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="text-sm font-medium transition-colors hover:text-violet-400"
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
                  <h3 className="text-lg font-semibold">{t("social")}</h3>
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
