"use client";

import { useActionErrorMessage } from "@/lib/actions/use-action-error";
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
import { TagSelector, toTagPayload, type SelectedTag } from "@/components/admin/tag-selector";
import type { TagOption } from "@/lib/tags/options";
import { FileUploader } from "@/components/ui/file-uploader";
import type { AdminExperience } from "@/lib/types/content";
import { toAttachments, type Attachment } from "@/lib/media/attachments";
import { ImageUpload } from "@/components/ui/image-upload";
import { createExperience, updateExperience } from "@/app/actions/admin";
import { useTranslations } from "next-intl";

interface ExperienceFormClientProps {
  initialData?: AdminExperience | null;
  tagOptions: TagOption[];
  isEdit?: boolean;
}

export default function ExperienceFormClient({
  initialData,
  tagOptions: initialTagOptions,
  isEdit,
}: ExperienceFormClientProps) {
  const t = useTranslations("admin");
  const errorMessage = useActionErrorMessage();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [company, setCompany] = useState(initialData?.company || "");
  const [positionTr, setPositionTr] = useState(initialData?.positionTr || "");
  const [positionEn, setPositionEn] = useState(initialData?.positionEn || "");
  const [logo, setLogo] = useState(initialData?.logoPath || "");
  const [locationTr, setLocationTr] = useState(initialData?.locationTr || "");
  const [locationEn, setLocationEn] = useState(initialData?.locationEn || "");
  const [descriptionTr, setDescriptionTr] = useState(initialData?.descriptionTr || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [detailsTr, setDetailsTr] = useState(initialData?.detailsTr || "");
  const [detailsEn, setDetailsEn] = useState(initialData?.detailsEn || "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "",
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : "",
  );
  const [published, setPublished] = useState(initialData?.published ?? true);

  const [tagOptions, setTagOptions] = useState(initialTagOptions);
  const [tags, setTags] = useState<SelectedTag[]>(
    () =>
      initialData?.tags.map((t) => ({ id: t.id, source: t.source, linkHidden: t.linkHidden })) ??
      [],
  );

  // Files
  const [files, setFiles] = useState<Attachment[]>(() => toAttachments(initialData?.files));

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
      logoPath: logo,
      locationTr,
      locationEn,
      descriptionTr,
      descriptionEn,
      detailsTr,
      detailsEn,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      published,
      ...toTagPayload(tags),
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
        toast.error(errorMessage(res.error));
      } else {
        toast.success(isEdit ? t("experience_updated") : t("experience_created"));
        router.push(`/${locale}/admin/experiences`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? t("editExperience") : t("addExperience")}</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
          >
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol Kolon: Temel Bilgiler */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("generalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience-field-1">{t("companyName")} *</Label>
                <Input
                  id="experience-field-1"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="bg-accent/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience-location-tr">
                    {t("location")} (TR) ({t("optional")})
                  </Label>
                  <Input
                    id="experience-location-tr"
                    value={locationTr}
                    onChange={(e) => setLocationTr(e.target.value)}
                    className="bg-accent/30"
                    placeholder="İzmir, Türkiye"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience-location-en">
                    {t("location")} (EN) ({t("optional")})
                  </Label>
                  <Input
                    id="experience-location-en"
                    value={locationEn}
                    onChange={(e) => setLocationEn(e.target.value)}
                    className="bg-accent/30"
                    placeholder="Izmir, Türkiye"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience-field-2">{t("position")} (TR) *</Label>
                  <Input
                    id="experience-field-2"
                    value={positionTr}
                    onChange={(e) => setPositionTr(e.target.value)}
                    required
                    className="bg-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience-field-3">{t("position")} (EN) *</Label>
                  <Input
                    id="experience-field-3"
                    value={positionEn}
                    onChange={(e) => setPositionEn(e.target.value)}
                    required
                    className="bg-accent/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t("companyLogo")} ({t("optional")})
                </Label>
                <ImageUpload value={logo} onChange={setLogo} folder="experiences" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experience-field-4">{t("summary")} (TR) *</Label>
                  <Textarea
                    id="experience-field-4"
                    value={descriptionTr}
                    onChange={(e) => setDescriptionTr(e.target.value)}
                    required
                    className="bg-accent/30"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience-field-5">{t("summary")} (EN) *</Label>
                  <Textarea
                    id="experience-field-5"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    required
                    className="bg-accent/30"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("details")} (TR)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={detailsTr}
                label={`${t("details")} (TR)`}
                onChange={setDetailsTr}
                placeholder={t("duties")}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("details")} (EN)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={detailsEn}
                label={`${t("details")} (EN)`}
                onChange={setDetailsEn}
                placeholder={t("duties")}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("addedFiles")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader files={files} onChange={setFiles} folder="experiences" />
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
                <Label htmlFor="experience-field-6">{t("startDate")} *</Label>
                <Input
                  id="experience-field-6"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-accent/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience-field-51">
                  {t("endDate")} ({t("currentJob")})
                </Label>
                <Input
                  id="experience-field-51"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-accent/30"
                />
              </div>
              <div className="flex items-center space-x-2 border-t border-border/50 pt-4">
                <Switch
                  id="experience-field-7"
                  checked={published}
                  onCheckedChange={setPublished}
                />
                <Label htmlFor="experience-field-7">{t("published")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("tags")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TagSelector
                options={tagOptions}
                onOptionsChange={setTagOptions}
                value={tags}
                onChange={setTags}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
