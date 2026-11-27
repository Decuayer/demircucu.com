"use client";

import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { AdminSiteSettings } from "@/lib/types/content";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Plus, Trash2, Smile } from "lucide-react";
import { toast } from "sonner";
import { updateSiteSettings } from "@/app/actions/settings";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { PdfUpload } from "@/components/admin/pdf-upload";
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

type HobbyState = { nameTr: string; nameEn: string; descTr: string; descEn: string; icon: string };

interface AdminSettingsClientProps {
  initialSettings: AdminSiteSettings | null;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const t = useTranslations("admin");
  const errorMessage = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();

  // Settings State
  const [heroTitleTr, setHeroTitleTr] = useState(initialSettings?.heroTitleTr || "");
  const [heroTitleEn, setHeroTitleEn] = useState(initialSettings?.heroTitleEn || "");
  const [heroSubTr, setHeroSubTr] = useState(initialSettings?.heroSubTr || "");
  const [heroSubEn, setHeroSubEn] = useState(initialSettings?.heroSubEn || "");

  const [aboutBioTr, setAboutBioTr] = useState(initialSettings?.aboutBioTr || "");
  const [aboutBioEn, setAboutBioEn] = useState(initialSettings?.aboutBioEn || "");
  const [aboutPhoto, setAboutPhoto] = useState(initialSettings?.aboutPhotoPath || "");
  const [cvPathTr, setCvPathTr] = useState(initialSettings?.cvPathTr || "");
  const [cvPathEn, setCvPathEn] = useState(initialSettings?.cvPathEn || "");
  const [aboutLocationTr, setAboutLocationTr] = useState(initialSettings?.aboutLocationTr || "");
  const [aboutLocationEn, setAboutLocationEn] = useState(initialSettings?.aboutLocationEn || "");
  const [aboutExperienceTr, setAboutExperienceTr] = useState(
    initialSettings?.aboutExperienceTr || "",
  );
  const [aboutExperienceEn, setAboutExperienceEn] = useState(
    initialSettings?.aboutExperienceEn || "",
  );

  const [hobbies, setHobbies] = useState<HobbyState[]>(
    () => (initialSettings?.hobbies as HobbyState[] | null) || [],
  );

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

  const [heroIntroTr, setHeroIntroTr] = useState(initialSettings?.heroIntroTr || "");
  const [heroIntroEn, setHeroIntroEn] = useState(initialSettings?.heroIntroEn || "");

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
  const [faviconUrl, setFaviconUrl] = useState(initialSettings?.faviconPath || "");

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
        aboutPhotoPath: aboutPhoto,
        aboutLocationTr,
        cvPathTr,
        cvPathEn,
        aboutLocationEn,
        aboutExperienceTr,
        aboutExperienceEn,
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
        heroIntroTr,
        heroIntroEn,
        footerTitleTr,
        footerTitleEn,
        footerDescriptionTr,
        footerDescriptionEn,
        siteTitleTr,
        siteTitleEn,
        siteDescriptionTr,
        siteDescriptionEn,
        faviconPath: faviconUrl,
      };

      const res = await updateSiteSettings(payload);

      if (res.error) {
        toast.error(errorMessage(res.error));
      } else {
        toast.success(t("settingsSaved") || "Ayarlar başarıyla kaydedildi!");
      }
    });
  };

  const addHobby = () =>
    setHobbies([...hobbies, { nameTr: "", nameEn: "", descTr: "", descEn: "", icon: "Heart" }]);
  const removeHobby = (index: number) => setHobbies(hobbies.filter((_, i) => i !== index));
  const updateHobby = <K extends keyof HobbyState>(
    index: number,
    field: K,
    value: HobbyState[K],
  ) => {
    const newHobbies = [...hobbies];
    newHobbies[index] = { ...newHobbies[index], [field]: value };
    setHobbies(newHobbies);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="enter flex items-center gap-3 text-2xl font-bold">
          <Settings className="h-6 w-6 text-link" />
          {t("siteSettings")}
        </h1>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="border-0 bg-primary text-primary-foreground"
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
                  <Label htmlFor="settings-field-1">{t("heroName")} (TR)</Label>
                  <Input
                    id="settings-field-1"
                    value={heroTitleTr}
                    onChange={(e) => setHeroTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demir Cücü"
                    aria-describedby="settings-hero-name-hint"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-2">{t("heroName")} (EN)</Label>
                  <Input
                    id="settings-field-2"
                    value={heroTitleEn}
                    onChange={(e) => setHeroTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demir Cücü"
                    aria-describedby="settings-hero-name-hint"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-field-3">{t("subTitle")} (TR)</Label>
                  <Input
                    id="settings-field-3"
                    value={heroSubTr}
                    onChange={(e) => setHeroSubTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Full-Stack Developer..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-4">{t("subTitle")} (EN)</Label>
                  <Input
                    id="settings-field-4"
                    value={heroSubEn}
                    onChange={(e) => setHeroSubEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Full-Stack Developer..."
                  />
                </div>
              </div>
              <p id="settings-hero-name-hint" className="text-xs text-muted-foreground">
                {t("heroNameHint")}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-hero-intro-tr">{t("heroIntro")} (TR)</Label>
                  <Textarea
                    id="settings-hero-intro-tr"
                    value={heroIntroTr}
                    onChange={(e) => setHeroIntroTr(e.target.value)}
                    className="bg-accent/30"
                    rows={4}
                    maxLength={600}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-hero-intro-en">{t("heroIntro")} (EN)</Label>
                  <Textarea
                    id="settings-hero-intro-en"
                    value={heroIntroEn}
                    onChange={(e) => setHeroIntroEn(e.target.value)}
                    className="bg-accent/30"
                    rows={4}
                    maxLength={600}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("heroIntroHint")}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{t("footerSection")}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-field-9">{t("footerTitle")} (TR)</Label>
                  <Input
                    id="settings-field-9"
                    value={footerTitleTr}
                    onChange={(e) => setFooterTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="demircucu.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-10">{t("footerTitle")} (EN)</Label>
                  <Input
                    id="settings-field-10"
                    value={footerTitleEn}
                    onChange={(e) => setFooterTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="demircucu.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-field-11">{t("footerDescription")} (TR)</Label>
                  <Textarea
                    id="settings-field-11"
                    value={footerDescriptionTr}
                    onChange={(e) => setFooterDescriptionTr(e.target.value)}
                    className="bg-accent/30"
                    rows={3}
                    placeholder="Full-Stack Developer & Software Engineer..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-12">{t("footerDescription")} (EN)</Label>
                  <Textarea
                    id="settings-field-12"
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
                    <ImageUpload value={aboutPhoto} onChange={setAboutPhoto} folder="settings" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-cv-tr">{t("cv")} (TR)</Label>
                    <PdfUpload id="settings-cv-tr" value={cvPathTr} onChange={setCvPathTr} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-cv-en">{t("cv")} (EN)</Label>
                    <PdfUpload id="settings-cv-en" value={cvPathEn} onChange={setCvPathEn} />
                    <p className="text-xs text-muted-foreground">{t("cvHint")}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="settings-field-13">{t("location")} (TR)</Label>
                      <Input
                        id="settings-field-13"
                        value={aboutLocationTr}
                        onChange={(e) => setAboutLocationTr(e.target.value)}
                        className="bg-accent/30"
                        placeholder="İstanbul, Türkiye"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-field-14">{t("location")} (EN)</Label>
                      <Input
                        id="settings-field-14"
                        value={aboutLocationEn}
                        onChange={(e) => setAboutLocationEn(e.target.value)}
                        className="bg-accent/30"
                        placeholder="Istanbul, Turkey"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="settings-field-15">{t("experience")} (TR)</Label>
                      <Input
                        id="settings-field-15"
                        value={aboutExperienceTr}
                        onChange={(e) => setAboutExperienceTr(e.target.value)}
                        className="bg-accent/30"
                        placeholder="5+ Yıl Deneyim"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-field-16">{t("experience")} (EN)</Label>
                      <Input
                        id="settings-field-16"
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
                      label={`${t("detailedBiography")} (TR)`}
                      onChange={setAboutBioTr}
                      placeholder="Kendinizden bahsedin..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("detailedBiography")} (EN)</Label>
                    <RichTextEditor
                      content={aboutBioEn}
                      label={`${t("detailedBiography")} (EN)`}
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
                  <Label htmlFor="settings-field-17">{t("email")}</Label>
                  <Input
                    id="settings-field-17"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-accent/30"
                    placeholder="info@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-18">{t("phone")}</Label>
                  <Input
                    id="settings-field-18"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="bg-accent/30"
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-field-19">{t("address")}</Label>
                <Textarea
                  id="settings-field-19"
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
                  <Label htmlFor="settings-field-20">GitHub URL</Label>
                  <Input
                    id="settings-field-20"
                    value={socialGithub}
                    onChange={(e) => setSocialGithub(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-21">LinkedIn URL</Label>
                  <Input
                    id="settings-field-21"
                    value={socialLinkedin}
                    onChange={(e) => setSocialLinkedin(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-22">Twitter / X URL</Label>
                  <Input
                    id="settings-field-22"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-23">Instagram URL</Label>
                  <Input
                    id="settings-field-23"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-24">YouTube URL</Label>
                  <Input
                    id="settings-field-24"
                    value={socialYoutube}
                    onChange={(e) => setSocialYoutube(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-25">Medium URL</Label>
                  <Input
                    id="settings-field-25"
                    value={socialMedium}
                    onChange={(e) => setSocialMedium(e.target.value)}
                    className="bg-accent/30"
                    placeholder="https://medium.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-26">StackOverflow URL</Label>
                  <Input
                    id="settings-field-26"
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
            <CardContent className="space-y-2 p-6">
              <h2 className="text-lg font-semibold">{t("skillsSettings")}</h2>
              <p className="text-sm text-muted-foreground">{t("skillsMovedToTags")}</p>
              <Link href="/admin/tags" className="text-sm font-medium text-link hover:underline">
                {t("tags")}
              </Link>
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
                          aria-label={t("removeHobby")}
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
                  <Label htmlFor="settings-field-27">{t("siteTitle")} (TR)</Label>
                  <Input
                    id="settings-field-27"
                    value={siteTitleTr}
                    onChange={(e) => setSiteTitleTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demircucu | Full-Stack Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-28">{t("siteTitle")} (EN)</Label>
                  <Input
                    id="settings-field-28"
                    value={siteTitleEn}
                    onChange={(e) => setSiteTitleEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Demircucu | Full-Stack Developer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-field-29">{t("siteDescription")} (TR)</Label>
                  <Textarea
                    id="settings-field-29"
                    value={siteDescriptionTr}
                    onChange={(e) => setSiteDescriptionTr(e.target.value)}
                    className="bg-accent/30"
                    rows={4}
                    placeholder="Siteniz hakkında kısa bir açıklama..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-field-30">{t("siteDescription")} (EN)</Label>
                  <Textarea
                    id="settings-field-30"
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
                <ImageUpload value={faviconUrl} onChange={setFaviconUrl} folder="settings" />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("siteIconPlaceholder")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
