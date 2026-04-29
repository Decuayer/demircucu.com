"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/actions/settings";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminSettingsClientProps {
  initialSettings: any;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const t = useTranslations("admin");
  const [isPending, startTransition] = useTransition();

  // Settings State
  const [heroTitle, setHeroTitle] = useState(initialSettings?.heroTitle || "");
  const [heroSub, setHeroSub] = useState(initialSettings?.heroSub || "");
  
  const [aboutBio, setAboutBio] = useState(initialSettings?.aboutBio || "");
  const [aboutPhoto, setAboutPhoto] = useState(initialSettings?.aboutPhoto || "");
  const [aboutLocation, setAboutLocation] = useState(initialSettings?.aboutLocation || "");
  const [aboutExperience, setAboutExperience] = useState(initialSettings?.aboutExperience || "");
  
  const [skills, setSkills] = useState<{name: string, level: number}[]>(initialSettings?.skills || []);
  const [hobbies, setHobbies] = useState<{name: string, desc: string, icon: string}[]>(initialSettings?.hobbies || []);

  const [contactEmail, setContactEmail] = useState(initialSettings?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(initialSettings?.contactPhone || "");
  const [contactAddress, setContactAddress] = useState(initialSettings?.contactAddress || "");

  const [socialGithub, setSocialGithub] = useState(initialSettings?.socialGithub || "");
  const [socialLinkedin, setSocialLinkedin] = useState(initialSettings?.socialLinkedin || "");
  const [socialTwitter, setSocialTwitter] = useState(initialSettings?.socialTwitter || "");

  const [ctaTitle, setCtaTitle] = useState(initialSettings?.ctaTitle || "");
  const [ctaDescription, setCtaDescription] = useState(initialSettings?.ctaDescription || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      const payload = {
        heroTitle, heroSub,
        aboutBio, aboutPhoto, aboutLocation, aboutExperience,
        skills, hobbies,
        contactEmail, contactPhone, contactAddress,
        socialGithub, socialLinkedin, socialTwitter,
        ctaTitle, ctaDescription
      };

      const res = await updateSiteSettings(payload);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Ayarlar başarıyla kaydedildi!");
      }
    });
  };

  const addSkill = () => setSkills([...skills, { name: "", level: 50 }]);
  const removeSkill = (index: number) => setSkills(skills.filter((_, i) => i !== index));
  const updateSkill = (index: number, field: string, value: any) => {
    const newSkills = [...skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setSkills(newSkills);
  };

  const addHobby = () => setHobbies([...hobbies, { name: "", desc: "", icon: "Heart" }]);
  const removeHobby = (index: number) => setHobbies(hobbies.filter((_, i) => i !== index));
  const updateHobby = (index: number, field: string, value: any) => {
    const newHobbies = [...hobbies];
    newHobbies[index] = { ...newHobbies[index], [field]: value };
    setHobbies(newHobbies);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold flex items-center gap-3"
        >
          <Settings className="h-6 w-6 text-violet-400" />
          Site Ayarları
        </motion.h1>
        <Button 
          onClick={handleSubmit} 
          disabled={isPending}
          className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0"
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Kaydediliyor..." : t("save")}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="general">Genel & Hero</TabsTrigger>
          <TabsTrigger value="about">Hakkımda</TabsTrigger>
          <TabsTrigger value="contact">İletişim & Sosyal</TabsTrigger>
          <TabsTrigger value="skills">Yetenekler & Hobiler</TabsTrigger>
        </TabsList>

        {/* GENEL & HERO */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Hero Bölümü (Ana Sayfa)</h2>
              <div className="space-y-2">
                <Label>Ana Başlık</Label>
                <Input value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className="bg-accent/30" placeholder="Merhaba, Ben..." />
              </div>
              <div className="space-y-2">
                <Label>Alt Başlık / Unvan</Label>
                <Input value={heroSub} onChange={e => setHeroSub(e.target.value)} className="bg-accent/30" placeholder="Full-Stack Developer..." />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Call to Action (Ana Sayfa Altı)</h2>
              <div className="space-y-2">
                <Label>CTA Başlık</Label>
                <Input value={ctaTitle} onChange={e => setCtaTitle(e.target.value)} className="bg-accent/30" placeholder="Birlikte Çalışalım" />
              </div>
              <div className="space-y-2">
                <Label>CTA Açıklama</Label>
                <Textarea value={ctaDescription} onChange={e => setCtaDescription(e.target.value)} className="bg-accent/30" rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HAKKIMDA */}
        <TabsContent value="about" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Profil ve Biyografi</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profil Fotoğrafı</Label>
                    <ImageUpload value={aboutPhoto} onChange={setAboutPhoto} folder="settings" usedIn="settings:profile" />
                  </div>
                  <div className="space-y-2">
                    <Label>Lokasyon</Label>
                    <Input value={aboutLocation} onChange={e => setAboutLocation(e.target.value)} className="bg-accent/30" placeholder="İstanbul, Türkiye" />
                  </div>
                  <div className="space-y-2">
                    <Label>Deneyim (Kısa Metin)</Label>
                    <Input value={aboutExperience} onChange={e => setAboutExperience(e.target.value)} className="bg-accent/30" placeholder="5+ Yıl Deneyim" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Detaylı Biyografi (Rich Text)</Label>
                  <RichTextEditor content={aboutBio} onChange={setAboutBio} placeholder="Kendinizden bahsedin..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* İLETİŞİM & SOSYAL */}
        <TabsContent value="contact" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">İletişim Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="bg-accent/30" placeholder="info@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-accent/30" placeholder="+90 5XX XXX XX XX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Textarea value={contactAddress} onChange={e => setContactAddress(e.target.value)} className="bg-accent/30 resize-none" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Sosyal Medya Linkleri</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input value={socialGithub} onChange={e => setSocialGithub(e.target.value)} className="bg-accent/30" placeholder="https://github.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input value={socialLinkedin} onChange={e => setSocialLinkedin(e.target.value)} className="bg-accent/30" placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label>Twitter URL</Label>
                  <Input value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} className="bg-accent/30" placeholder="https://twitter.com/..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YETENEKLER & HOBİLER */}
        <TabsContent value="skills" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">Yetenekler (Skills)</h2>
                <Button type="button" onClick={addSkill} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Yetenek Ekle
                </Button>
              </div>
              
              {skills.length === 0 ? (
                <p className="text-muted-foreground text-sm">Henüz yetenek eklenmemiş.</p>
              ) : (
                <div className="space-y-3">
                  {skills.map((skill, index) => (
                    <div key={index} className="flex gap-3 items-center bg-accent/20 p-3 rounded-lg border border-border/50">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">Yetenek Adı</Label>
                        <Input value={skill.name} onChange={e => updateSkill(index, "name", e.target.value)} className="bg-background h-8" placeholder="Örn: React" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">Seviye (0-100)</Label>
                        <Input type="number" min="0" max="100" value={skill.level} onChange={e => updateSkill(index, "level", parseInt(e.target.value) || 0)} className="bg-background h-8" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive mt-5" onClick={() => removeSkill(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">Hobiler ve İlgi Alanları</h2>
                <Button type="button" onClick={addHobby} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Hobi Ekle
                </Button>
              </div>
              
              {hobbies.length === 0 ? (
                <p className="text-muted-foreground text-sm">Henüz hobi eklenmemiş.</p>
              ) : (
                <div className="space-y-3">
                  {hobbies.map((hobby, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-accent/20 p-3 rounded-lg border border-border/50">
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground mb-1 block">Hobi Adı</Label>
                        <Input value={hobby.name} onChange={e => updateHobby(index, "name", e.target.value)} className="bg-background h-8" placeholder="Örn: Fotoğrafçılık" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground mb-1 block">İkon (Lucide adı)</Label>
                        <Input value={hobby.icon} onChange={e => updateHobby(index, "icon", e.target.value)} className="bg-background h-8" placeholder="Camera" />
                      </div>
                      <div className="md:col-span-5">
                        <Label className="text-xs text-muted-foreground mb-1 block">Açıklama</Label>
                        <Input value={hobby.desc} onChange={e => updateHobby(index, "desc", e.target.value)} className="bg-background h-8" placeholder="Kısa açıklama..." />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" size="icon" className="text-destructive mt-5" onClick={() => removeHobby(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
