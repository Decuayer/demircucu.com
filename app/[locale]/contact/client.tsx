"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "@/components/icons";
import { useState } from "react";
import { toast } from "sonner";
import { submitContactMessage } from "@/app/actions/contact";

interface ContactClientProps {
  settings: any;
}

export default function ContactClient({ settings }: ContactClientProps) {
  const t = useTranslations("contact");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    const res = await submitContactMessage({ name, email, subject, message });
    
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(t("success") || "Mesajınız başarıyla gönderildi!");
      (e.target as HTMLFormElement).reset();
    }
  };

  const contactInfo = [
    { icon: Mail, label: "Email", value: settings?.contactEmail || "info@demircucu.com", href: `mailto:${settings?.contactEmail || "info@demircucu.com"}` },
    { icon: MapPin, label: "Konum", value: settings?.contactAddress || "İstanbul, Türkiye", href: null },
    { icon: Phone, label: "Telefon", value: settings?.contactPhone || "+90 (5XX) XXX XX XX", href: null },
  ];

  const socialLinks = [];
  if (settings?.socialGithub) socialLinks.push({ icon: GithubIcon, label: "GitHub", href: settings.socialGithub });
  else socialLinks.push({ icon: GithubIcon, label: "GitHub", href: "https://github.com/demircucu" });
  
  if (settings?.socialLinkedin) socialLinks.push({ icon: LinkedinIcon, label: "LinkedIn", href: settings.socialLinkedin });
  if (settings?.socialTwitter) socialLinks.push({ icon: TwitterIcon, label: "Twitter", href: settings.socialTwitter });

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge
            variant="secondary"
            className="mb-4 px-4 py-1.5 bg-violet-500/10 text-violet-400 border-violet-500/20"
          >
            <Mail className="h-3 w-3 mr-1" />
            {t("title")}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold">{t("title")}</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("name")}</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        className="bg-accent/30 border-border/50"
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
                        className="bg-accent/30 border-border/50"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("subject")}</Label>
                    <Input
                      id="subject"
                      name="subject"
                      className="bg-accent/30 border-border/50"
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
                      className="bg-accent/30 border-border/50 resize-none"
                      placeholder="Mesajınızı buraya yazın..."
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0"
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
            className="lg:col-span-2 space-y-6"
          >
            {/* Info Cards */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-6">
                <h3 className="font-semibold text-lg">{t("info")}</h3>
                <div className="space-y-4">
                  {contactInfo.map((info) => (
                    <div key={info.label} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
                        <info.icon className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{info.label}</p>
                        {info.href ? (
                          <a href={info.href} className="text-sm font-medium hover:text-violet-400 transition-colors">
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
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">{t("social")}</h3>
                  <div className="flex gap-3">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 transition-all"
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
