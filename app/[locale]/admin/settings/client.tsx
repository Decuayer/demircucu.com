"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Plus, Trash2, ChevronDown, Smile } from "lucide-react";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/actions/settings";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMMON_EMOJIS = [
  "📸",
  "🎮",
  "📚",
  "🎧",
  "💻",
  "🎨",
  "⚽",
  "🍳",
  "✈️",
  "🌱",
  "🧘",
  "🚲",
  "🎬",
  "🎸",
  "🎤",
  "🧩",
  "❤️",
  "🏀",
  "🍕",
  "🎭",
  "🏃",
  "🚶",
  "🧗",
  "🏊",
  "🚣",
  "🏄",
  "🏇",
  "🏌️",
  "🛹",
  "⛸️",
  "🛶",
  "🏕️",
  "🏜️",
  "🏝️",
  "🌋",
  "🏔️",
  "🏕️",
  "🏙️",
  "🎡",
  "🎢",
  "📱",
  "⌚",
  "📷",
  "💻",
  "⌨️",
  "🖱️",
  "💿",
  "🔋",
  "🔌",
  "🕯️",
  "💡",
  "🔦",
  "🏮",
  "🧱",
  "⚙️",
  "🔧",
  "🔨",
  "⚒️",
  "🛠️",
  "⛏️",
  "🍣",
  "🍦",
  "🍩",
  "🍪",
  "🍫",
  "🧁",
  "🍿",
  "🥟",
  "🥨",
  "🥖",
  "🥐",
  "🥪",
  "🥗",
  "🥘",
  "🍜",
  "🍛",
  "🍢",
  "🍱",
  "🍚",
  "🍮",
];

const LUCIDE_ICONS = [
  "Camera",
  "Gamepad2",
  "BookOpen",
  "Music",
  "Code2",
  "Globe",
  "Coffee",
  "Heart",
  "Palette",
  "Bike",
  "Plane",
  "Leaf",
  "Zap",
  "Sparkles",
  "Anchor",
  "Sun",
  "Moon",
  "Cloud",
  "Star",
  "Umbrella",
  "Tent",
  "Mountain",
  "Waves",
  "Wind",
  "Binary",
  "Cpu",
  "Database",
  "Terminal",
  "Braces",
  "Layout",
  "Monitor",
  "Smartphone",
  "Tablet",
  "Watch",
  "Film",
  "Headphones",
  "Mic",
  "Radio",
  "Tv",
  "Video",
  "Briefcase",
  "GraduationCap",
  "Library",
  "School",
  "University",
  "Pizza",
  "Utensils",
  "Wine",
  "Beer",
  "Apple",
  "IceCream",
  "Dumbbell",
  "Trophy",
  "Flag",
  "Medal",
  "Timer",
  "MessageCircle",
  "Mail",
  "Phone",
  "Share2",
  "Users",
  "ShoppingBag",
  "ShoppingCart",
  "CreditCard",
  "Wallet",
  "Home",
  "Building",
  "Building2",
  "Map",
  "Navigation",
  "Pen",
  "Pencil",
  "Eraser",
  "Brush",
  "Scissors",
  "Gift",
  "Key",
  "Lock",
  "Unlock",
  "Bell",
  "Eye",
  "Search",
];

interface AdminSettingsClientProps {
  initialSettings: any;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const t = useTranslations("admin");
  const [isPending, startTransition] = useTransition();

  // Settings State
  const [heroTitleTr, setHeroTitleTr] = useState(initialSettings?.heroTitleTr || "");
  const [heroTitleEn, setHeroTitleEn] = useState(initialSettings?.heroTitleEn || "");
  const [heroSubTr, setHeroSubTr] = useState(initialSettings?.heroSubTr || "");
  const [heroSubEn, setHeroSubEn] = useState(initialSettings?.heroSubEn || "");

  const [aboutBioTr, setAboutBioTr] = useState(initialSettings?.aboutBioTr || "");
  const [aboutBioEn, setAboutBioEn] = useState(initialSettings?.aboutBioEn || "");
  const [aboutPhoto, setAboutPhoto] = useState(initialSettings?.aboutPhoto || "");
  const [aboutLocationTr, setAboutLocationTr] = useState(initialSettings?.aboutLocationTr || "");
  const [aboutLocationEn, setAboutLocationEn] = useState(initialSettings?.aboutLocationEn || "");
  const [aboutExperienceTr, setAboutExperienceTr] = useState(
    initialSettings?.aboutExperienceTr || "",
  );
  const [aboutExperienceEn, setAboutExperienceEn] = useState(
    initialSettings?.aboutExperienceEn || "",
  );

  const [skills, setSkills] = useState<{ nameTr: string; nameEn: string; level: number }[]>(
    initialSettings?.skills || [],
  );
  const [hobbies, setHobbies] = useState<
    { nameTr: string; nameEn: string; descTr: string; descEn: string; icon: string }[]
  >(initialSettings?.hobbies || []);

  const [contactEmail, setContactEmail] = useState(initialSettings?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(initialSettings?.contactPhone || "");
  const [contactAddress, setContactAddress] = useState(initialSettings?.contactAddress || "");

  const [socialGithub, setSocialGithub] = useState(initialSettings?.socialGithub || "");
  const [socialLinkedin, setSocialLinkedin] = useState(initialSettings?.socialLinkedin || "");
  const [socialTwitter, setSocialTwitter] = useState(initialSettings?.socialTwitter || "");
  const [socialInstagram, setSocialInstagram] = useState(initialSettings?.socialInstagram || "");
  const [socialYoutube, setSocialYoutube] = useState(initialSettings?.socialYoutube || "");
  const [socialMedium, setSocialMedium] = useState(initialSettings?.socialMedium || "");
  const [socialStackoverflow, setSocialStackoverflow] = useState(
    initialSettings?.socialStackoverflow || "",
  );

  const [ctaTitleTr, setCtaTitleTr] = useState(initialSettings?.ctaTitleTr || "");
  const [ctaTitleEn, setCtaTitleEn] = useState(initialSettings?.ctaTitleEn || "");
  const [ctaDescriptionTr, setCtaDescriptionTr] = useState(initialSettings?.ctaDescriptionTr || "");
  const [ctaDescriptionEn, setCtaDescriptionEn] = useState(initialSettings?.ctaDescriptionEn || "");

  const [footerTitleTr, setFooterTitleTr] = useState(initialSettings?.footerTitleTr || "");
  const [footerTitleEn, setFooterTitleEn] = useState(initialSettings?.footerTitleEn || "");
  const [footerDescriptionTr, setFooterDescriptionTr] = useState(
    initialSettings?.footerDescriptionTr || "",
  );
  const [footerDescriptionEn, setFooterDescriptionEn] = useState(
    initialSettings?.footerDescriptionEn || "",
  );

  const [siteTitleTr, setSiteTitleTr] = useState(initialSettings?.siteTitleTr || "");
  const [siteTitleEn, setSiteTitleEn] = useState(initialSettings?.siteTitleEn || "");
  const [siteDescriptionTr, setSiteDescriptionTr] = useState(
    initialSettings?.siteDescriptionTr || "",
  );
  const [siteDescriptionEn, setSiteDescriptionEn] = useState(
    initialSettings?.siteDescriptionEn || "",
  );
  const [faviconUrl, setFaviconUrl] = useState(initialSettings?.faviconUrl || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const payload = {
        heroTitleTr,
        heroTitleEn,
        heroSubTr,
        heroSubEn,
        aboutBioTr,
        aboutBioEn,
        aboutPhoto,
        aboutLocationTr,
        aboutLocationEn,
        aboutExperienceTr,
        aboutExperienceEn,
        skills,
        hobbies,
        contactEmail,
        contactPhone,
        contactAddress,
        socialGithub,
        socialLinkedin,
        socialTwitter,
        socialInstagram,
        socialYoutube,
        socialMedium,
        socialStackoverflow,
        ctaTitleTr,
        ctaTitleEn,
        ctaDescriptionTr,
        ctaDescriptionEn,
        footerTitleTr,
        footerTitleEn,
        footerDescriptionTr,
        footerDescriptionEn,
        siteTitleTr,
        siteTitleEn,
        siteDescriptionTr,
        siteDescriptionEn,
        faviconUrl,
      };

      const res = await updateSiteSettings(payload);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(t("settingsSaved") || "Ayarlar başarıyla kaydedildi!");
      }
    });
  };

  const addSkill = () => setSkills([...skills, { nameTr: "", nameEn: "", level: 50 }]);
  const removeSkill = (index: number) => setSkills(skills.filter((_, i) => i !== index));
  const updateSkill = (index: number, field: string, value: any) => {
    const newSkills = [...skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setSkills(newSkills);
  };

  const addHobby = () =>
    setHobbies([...hobbies, { nameTr: "", nameEn: "", descTr: "", descEn: "", icon: "Heart" }]);
  const removeHobby = (index: number) => setHobbies(hobbies.filter((_, i) => i !== index));
  const updateHobby = (index: number, field: string, value: any) => {
    const newHobbies = [...hobbies];
    newHobbies[index] = { ...newHobbies[index], [field]: value };
    setHobbies(newHobbies);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 text-2xl font-bold"
        >
          <Settings className="h-6 w-6 text-violet-400" />
          {t("siteSettings")}
        </motion.h1>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Kaydediliyor..." : t("save")}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-5">
          <TabsTrigger value="general">{t("generalHero")}</TabsTrigger>
          <TabsTrigger value="about">{t("about")}</TabsTrigger>
          <TabsTrigger value="contact">{t("contact")}</TabsTrigger>
          <TabsTrigger value="skills">{t("skills")}</TabsTrigger>
          <TabsTrigger value="seo">{t("seo")}</TabsTrigger>
        </TabsList>

        {/* GENEL & HERO */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">
                {t("heroSection")} ({t("homepage")})
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("mainTitle")} (TR)</Label>
                  <Input
                    value={heroTitleTr}
                    onChange={(e) => setHeroTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Merhaba, Ben..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("mainTitle")} (EN)</Label>
                  <Input
                    value={heroTitleEn}
                    onChange={(e) => setHeroTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Hello, I am..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("subTitle")} (TR)</Label>
                  <Input
                    value={heroSubTr}
                    onChange={(e) => setHeroSubTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Full-Stack Developer..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("subTitle")} (EN)</Label>
                  <Input
                    value={heroSubEn}
                    onChange={(e) => setHeroSubEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Full-Stack Developer..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">
                {t("cta")} ({t("footer")})
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("ctaTitle")} (TR)</Label>
                  <Input
                    value={ctaTitleTr}
                    onChange={(e) => setCtaTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Birlikte Çalışalım"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ctaTitle")} (EN)</Label>
                  <Input
                    value={ctaTitleEn}
                    onChange={(e) => setCtaTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Let's Work Together"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("ctaDescription")} (TR)</Label>
                  <Textarea
                    value={ctaDescriptionTr}
                    onChange={(e) => setCtaDescriptionTr(e.target.value)}
                    className="bg-accent/30"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ctaDescription")} (EN)</Label>
                  <Textarea
                    value={ctaDescriptionEn}
                    onChange={(e) => setCtaDescriptionEn(e.target.value)}
                    className="bg-accent/30"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("footerSection")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("footerTitle")} (TR)</Label>
                  <Input
                    value={footerTitleTr}
                    onChange={(e) => setFooterTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="demircucu.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("footerTitle")} (EN)</Label>
                  <Input
                    value={footerTitleEn}
                    onChange={(e) => setFooterTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="demircucu.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("footerDescription")} (TR)</Label>
                  <Textarea
                    value={footerDescriptionTr}
                    onChange={(e) => setFooterDescriptionTr(e.target.value)}
                    className="bg-accent/30"
                    rows={3}
                    placeholder="Full-Stack Developer & Software Engineer..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("footerDescription")} (EN)</Label>
                  <Textarea
                    value={footerDescriptionEn}
                    onChange={(e) => setFooterDescriptionEn(e.target.value)}
                    className="bg-accent/30"
                    rows={3}
                    placeholder="Full-Stack Developer & Software Engineer..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HAKKIMDA */}
        <TabsContent value="about" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("about")}</h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("profilePhoto")}</Label>
                    <ImageUpload
                      value={aboutPhoto}
                      onChange={setAboutPhoto}
                      folder="settings"
                      usedIn="settings:profile"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("location")} (TR)</Label>
                      <Input
                        value={aboutLocationTr}
                        onChange={(e) => setAboutLocationTr(e.target.value)}
                        className="bg-accent/30"
                        placeholder="İstanbul, Türkiye"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("location")} (EN)</Label>
                      <Input
                        value={aboutLocationEn}
                        onChange={(e) => setAboutLocationEn(e.target.value)}
                        className="bg-accent/30"
                        placeholder="Istanbul, Turkey"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("experience")} (TR)</Label>
                      <Input
                        value={aboutExperienceTr}
                        onChange={(e) => setAboutExperienceTr(e.target.value)}
                        className="bg-accent/30"
                        placeholder="5+ Yıl Deneyim"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("experience")} (EN)</Label>
                      <Input
                        value={aboutExperienceEn}
                        onChange={(e) => setAboutExperienceEn(e.target.value)}
                        className="bg-accent/30"
                        placeholder="5+ Years Experience"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("detailedBiography")} (TR)</Label>
                    <RichTextEditor
                      content={aboutBioTr}
                      onChange={setAboutBioTr}
                      placeholder="Kendinizden bahsedin..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("detailedBiography")} (EN)</Label>
                    <RichTextEditor
                      content={aboutBioEn}
                      onChange={setAboutBioEn}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* İLETİŞİM & SOSYAL */}
        <TabsContent value="contact" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("contact")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-accent/30"
                    placeholder="info@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="bg-accent/30"
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("address")}</Label>
                <Textarea
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="resize-none bg-accent/30"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("socialMedia")}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input
                    value={socialGithub}
                    onChange={(e) => setSocialGithub(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={socialLinkedin}
                    onChange={(e) => setSocialLinkedin(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X URL</Label>
                  <Input
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    value={socialYoutube}
                    onChange={(e) => setSocialYoutube(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medium URL</Label>
                  <Input
                    value={socialMedium}
                    onChange={(e) => setSocialMedium(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://medium.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>StackOverflow URL</Label>
                  <Input
                    value={socialStackoverflow}
                    onChange={(e) => setSocialStackoverflow(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://stackoverflow.com/users/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YETENEKLER & HOBİLER */}
        <TabsContent value="skills" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("skillsSettings")}</h2>
                <Button type="button" onClick={addSkill} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> {t("addSkill")}
                </Button>
              </div>

              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
              ) : (
                <div className="space-y-3">
                  {skills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-end gap-3 rounded-lg border border-border/50 bg-accent/20 p-3 md:flex-row"
                    >
                      <div className="w-full flex-[2]">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("skillName")} (TR)
                        </Label>
                        <Input
                          value={skill.nameTr}
                          onChange={(e) => updateSkill(index, "nameTr", e.target.value)}
                          className="h-8 bg-background"
                          placeholder="Örn: React"
                        />
                      </div>
                      <div className="w-full flex-[2]">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("skillName")} (EN)
                        </Label>
                        <Input
                          value={skill.nameEn}
                          onChange={(e) => updateSkill(index, "nameEn", e.target.value)}
                          className="h-8 bg-background"
                          placeholder="E.g. React"
                        />
                      </div>
                      <div className="w-full flex-1">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("level")} (0-100)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={skill.level}
                          onChange={(e) =>
                            updateSkill(index, "level", parseInt(e.target.value) || 0)
                          }
                          className="h-8 bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeSkill(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("hobbiesAndInterests")}</h2>
                <Button type="button" onClick={addHobby} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> {t("addHobby")}
                </Button>
              </div>

              {hobbies.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noHobbies")}</p>
              ) : (
                <div className="space-y-3">
                  {hobbies.map((hobby, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 items-start gap-3 rounded-lg border border-border/50 bg-accent/20 p-3 md:grid-cols-12"
                    >
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("hobbyName")} (TR)
                        </Label>
                        <Input
                          value={hobby.nameTr}
                          onChange={(e) => updateHobby(index, "nameTr", e.target.value)}
                          className="h-8 bg-background"
                          placeholder="Fotoğraf"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("hobbyName")} (EN)
                        </Label>
                        <Input
                          value={hobby.nameEn}
                          onChange={(e) => updateHobby(index, "nameEn", e.target.value)}
                          className="h-8 bg-background"
                          placeholder="Photography"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("hobbyIcon")}
                        </Label>
                        <div className="flex gap-1">
                          <Input
                            value={hobby.icon}
                            onChange={(e) => updateHobby(index, "icon", e.target.value)}
                            className="h-8 bg-background"
                            placeholder="Örn: 🎮 veya Camera"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                              <Smile className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="max-h-[400px] w-72 overflow-y-auto border-border bg-popover p-3 shadow-xl"
                            >
                              <div className="space-y-4">
                                <div>
                                  <p className="mb-2 px-1 text-[10px] font-bold text-muted-foreground uppercase">
                                    {t("popularEmojis")}
                                  </p>
                                  <div className="grid grid-cols-7 gap-1">
                                    {COMMON_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => updateHobby(index, "icon", emoji)}
                                        className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-accent"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="mb-2 px-1 text-[10px] font-bold text-muted-foreground uppercase">
                                    {t("lucideIcons")}
                                  </p>
                                  <div className="grid grid-cols-4 gap-1 px-1">
                                    {LUCIDE_ICONS.map((icon) => (
                                      <button
                                        key={icon}
                                        type="button"
                                        onClick={() => updateHobby(index, "icon", icon)}
                                        className="h-7 truncate rounded border border-border/50 px-1 py-1 text-center text-[9px] transition-colors hover:bg-accent"
                                        title={icon}
                                      >
                                        {icon}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("descriptionOnly")} (TR)
                        </Label>
                        <Input
                          value={hobby.descTr}
                          onChange={(e) => updateHobby(index, "descTr", e.target.value)}
                          className="h-8 bg-background"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {t("descriptionOnly")} (EN)
                        </Label>
                        <Input
                          value={hobby.descEn}
                          onChange={(e) => updateHobby(index, "descEn", e.target.value)}
                          className="h-8 bg-background"
                        />
                      </div>
                      <div className="flex justify-end md:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 text-destructive"
                          onClick={() => removeHobby(index)}
                        >
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

        {/* SEO & META */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("seoOpt")} (SEO)</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("siteTitle")} (TR)</Label>
                  <Input
                    value={siteTitleTr}
                    onChange={(e) => setSiteTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demircucu | Full-Stack Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("siteTitle")} (EN)</Label>
                  <Input
                    value={siteTitleEn}
                    onChange={(e) => setSiteTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demircucu | Full-Stack Developer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("siteDescription")} (TR)</Label>
                  <Textarea
                    value={siteDescriptionTr}
                    onChange={(e) => setSiteDescriptionTr(e.target.value)}
                    className="bg-accent/30"
                    rows={4}
                    placeholder="Siteniz hakkında kısa bir açıklama..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("siteDescription")} (EN)</Label>
                  <Textarea
                    value={siteDescriptionEn}
                    onChange={(e) => setSiteDescriptionEn(e.target.value)}
                    className="bg-accent/30"
                    rows={4}
                    placeholder="A short description about your site..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("siteIcon")} (Site İkonu)</Label>
                <ImageUpload
                  value={faviconUrl}
                  onChange={setFaviconUrl}
                  folder="settings"
                  usedIn="settings:favicon"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("siteIconPlaceholder")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
