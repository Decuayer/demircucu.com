"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TagSelector } from "@/components/ui/tag-selector";
import { FileUploader, FileAttachment } from "@/components/ui/file-uploader";
import { ImageUpload } from "@/components/ui/image-upload";
import { createProject, updateProject } from "@/app/actions/admin";
import { useTranslations } from "next-intl";


interface ProjectFormClientProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ProjectFormClient({ initialData, isEdit }: ProjectFormClientProps) {

  const t = useTranslations("admin");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [titleTr, setTitleTr] = useState(initialData?.titleTr || "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [logo, setLogo] = useState(initialData?.logo || "");
  const [summaryTr, setSummaryTr] = useState(initialData?.summaryTr || "");
  const [summaryEn, setSummaryEn] = useState(initialData?.summaryEn || "");
  const [descriptionTr, setDescriptionTr] = useState(initialData?.descriptionTr || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl || "");
  const [liveUrl, setLiveUrl] = useState(initialData?.liveUrl || "");
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);

  // Tags (Mapping relations to simplified objects for the server action)
  const [tags, setTags] = useState<string[]>(() => {
    const initialTags = initialData?.tags?.map((t: any) => t.nameTr || t.nameEn || t.name || "").filter(Boolean) || [];
    return Array.from(new Set(initialTags));
  });

  // Files
  const [files, setFiles] = useState<FileAttachment[]>(initialData?.files || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleTr || !titleEn || !slug || !summaryTr || !summaryEn) {
      toast.error("Lütfen zorunlu alanları (TR ve EN) doldurun.");
      return;
    }

    const payload = {
      titleTr,
      titleEn,
      slug,
      summaryTr,
      summaryEn,
      descriptionTr,
      descriptionEn,
      logo,
      githubUrl,
      liveUrl,
      published,
      featured,
      tagsList: tags.map(tag => ({
        nameTr: tag,
        nameEn: tag, // For now, we use same name for both languages for tech tags
        slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      })),
      filesList: files,
    };

    startTransition(async () => {
      let res;
      if (isEdit && initialData?.id) {
        res = await updateProject(initialData.id, payload);
      } else {
        res = await createProject(payload);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isEdit ? "Proje güncellendi." : "Proje başarıyla eklendi.");
        router.push(`/${locale}/admin/projects`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? t("editProject") : t("addProject")}</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
          <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Temel Bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('generalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('projectTitle')} (TR) *</Label>
                  <Input value={titleTr} onChange={e => setTitleTr(e.target.value)} required className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>{t('projectTitle')} (EN) *</Label>
                  <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} required className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('slug')} *</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} required className="bg-accent/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('summary')} (TR) *</Label>
                  <Textarea value={summaryTr} onChange={e => setSummaryTr(e.target.value)} required className="bg-accent/30" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>{t('summary')} (EN) *</Label>
                  <Textarea value={summaryEn} onChange={e => setSummaryEn(e.target.value)} required className="bg-accent/30" rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>Live URL ({t('liveSite')})</Label>
                  <Input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('coverImage')}</Label>
                <ImageUpload value={logo} onChange={setLogo} folder="projects" usedIn={isEdit ? `project:${initialData?.id}` : undefined} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('description')} (TR)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={descriptionTr} onChange={setDescriptionTr} placeholder="Projenizin tüm detaylarını buraya yazabilirsiniz..." />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('description')} (EN)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={descriptionEn} onChange={setDescriptionEn} placeholder="You can write all project details here..." />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('files')} ({t('optional')})</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader files={files} onChange={setFiles} folder="projects" usedIn={isEdit ? `project:${initialData?.id}` : undefined} />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Durum ve Etiketler */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('status')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>{t('published')}</Label>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch checked={featured} onCheckedChange={setFeatured} />
                <Label>{t('featured')}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t('technologies')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TagSelector tags={tags} onChange={setTags} />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
