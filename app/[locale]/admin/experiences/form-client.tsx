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
import { createExperience, updateExperience } from "@/app/actions/admin";
import { useTranslations } from "next-intl";


interface ExperienceFormClientProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ExperienceFormClient({ initialData, isEdit }: ExperienceFormClientProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [company, setCompany] = useState(initialData?.company || "");
  const [positionTr, setPositionTr] = useState(initialData?.positionTr || "");
  const [positionEn, setPositionEn] = useState(initialData?.positionEn || "");
  const [logo, setLogo] = useState(initialData?.logo || "");
  const [descriptionTr, setDescriptionTr] = useState(initialData?.descriptionTr || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [detailsTr, setDetailsTr] = useState(initialData?.detailsTr || "");
  const [detailsEn, setDetailsEn] = useState(initialData?.detailsEn || "");
  const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "");
  const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "");
  const [published, setPublished] = useState(initialData?.published ?? true);

  // Tags (Mapping relations to simplified objects for the server action)
  const [tags, setTags] = useState<string[]>(() => {
    const initialTags = initialData?.tags?.map((t: any) => t.nameTr || t.nameEn || t.name || "").filter(Boolean) || [];
    return Array.from(new Set(initialTags));
  });

  // Files
  const [files, setFiles] = useState<FileAttachment[]>(initialData?.files || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !positionTr || !positionEn || !descriptionTr || !descriptionEn || !startDate) {
      toast.error(t("required_fields"));
      return;
    }

    const payload = {
      company,
      positionTr,
      positionEn,
      logo,
      descriptionTr,
      descriptionEn,
      detailsTr,
      detailsEn,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      published,
      tagsList: tags.map(tag => ({
        nameTr: tag,
        nameEn: tag,
        slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      })),
      filesList: files,
    };

    startTransition(async () => {
      let res;
      if (isEdit && initialData?.id) {
        res = await updateExperience(initialData.id, payload);
      } else {
        res = await createExperience(payload);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isEdit ? t("experience_updated") : t("experience_created"));
        router.push(`/${locale}/admin/experiences`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? t("editExperience") : t("addExperience")}</h1>
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
              <CardTitle>{t("generalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("companyName")} *</Label>
                <Input value={company} onChange={e => setCompany(e.target.value)} required className="bg-accent/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("position")} (TR) *</Label>
                  <Input value={positionTr} onChange={e => setPositionTr(e.target.value)} required className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>{t("position")} (EN) *</Label>
                  <Input value={positionEn} onChange={e => setPositionEn(e.target.value)} required className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("companyLogo")} ({t("optional")})</Label>
                <ImageUpload value={logo} onChange={setLogo} folder="experiences" usedIn={isEdit ? `experience:${initialData?.id}` : undefined} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("summary")} (TR) *</Label>
                  <Textarea value={descriptionTr} onChange={e => setDescriptionTr(e.target.value)} required className="bg-accent/30" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{t("summary")} (EN) *</Label>
                  <Textarea value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} required className="bg-accent/30" rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("details")} (TR)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={detailsTr} onChange={setDetailsTr} placeholder={t("duties")} />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("details")} (EN)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={detailsEn} onChange={setDetailsEn} placeholder={t("duties")} />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("addedFiles")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader files={files} onChange={setFiles} folder="experiences" usedIn={isEdit ? `experience:${initialData?.id}` : undefined} />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Tarihler ve Etiketler */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("datesituation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("startDate")} *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="bg-accent/30" />
              </div>
              <div className="space-y-2">
                <Label>{t("endDate")} ({t("currentJob")})</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-accent/30" />
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t border-border/50">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>{t("published")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("tags")}</CardTitle>
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
