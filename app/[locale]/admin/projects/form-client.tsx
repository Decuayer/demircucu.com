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
import type { AdminProject } from "@/lib/types/content";
import { toAttachments, type Attachment } from "@/lib/media/attachments";
import { ImageUpload } from "@/components/ui/image-upload";
import { createProject, updateProject } from "@/app/actions/admin";
import { useTranslations } from "next-intl";

interface ProjectFormClientProps {
  initialData?: AdminProject | null;
  tagOptions: TagOption[];
  isEdit?: boolean;
}

export default function ProjectFormClient({
  initialData,
  tagOptions: initialTagOptions,
  isEdit,
}: ProjectFormClientProps) {
  const t = useTranslations("admin");
  const g = useTranslations("admin.github");
  // GitHub projects: titles and summaries are optional overrides of the repository data.
  const isGithub = initialData?.source === "GITHUB";
  const repoName = initialData?.githubFullName?.split("/").pop() ?? "";
  const repoDescription = initialData?.githubDescription ?? "";
  const mark = isGithub ? "" : " *";
  const errorMessage = useActionErrorMessage();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [titleTr, setTitleTr] = useState(initialData?.titleTr || "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [logo, setLogo] = useState(initialData?.logoPath || "");
  const [summaryTr, setSummaryTr] = useState(initialData?.summaryTr || "");
  const [summaryEn, setSummaryEn] = useState(initialData?.summaryEn || "");
  const [descriptionTr, setDescriptionTr] = useState(initialData?.descriptionTr || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl || "");
  const [liveUrl, setLiveUrl] = useState(initialData?.liveUrl || "");
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);

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

    if (!slug || (!isGithub && (!titleTr || !titleEn || !summaryTr || !summaryEn))) {
      toast.error(t("required_fields"));
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
      logoPath: logo,
      githubUrl,
      liveUrl,
      published,
      featured,
      ...toTagPayload(tags),
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
        toast.error(errorMessage(res.error));
      } else {
        toast.success(isEdit ? t("projectUpdated") : t("projectCreated"));
        router.push(`/${locale}/admin/projects`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? t("editProject") : t("addProject")}</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="border-0 bg-primary text-primary-foreground"
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
              {isGithub && (
                <p className="rounded-md border border-primary/40 bg-muted p-3 text-sm text-muted-foreground">
                  {g("overrideHint", { repo: initialData?.githubFullName ?? "" })}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="titleTr">
                    {t("projectTitle")} (TR){mark}
                  </Label>
                  <Input
                    id="titleTr"
                    value={titleTr}
                    onChange={(e) => setTitleTr(e.target.value)}
                    required={!isGithub}
                    placeholder={repoName}
                    className="bg-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleEn">
                    {t("projectTitle")} (EN){mark}
                  </Label>
                  <Input
                    id="titleEn"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    required={!isGithub}
                    placeholder={repoName}
                    className="bg-accent/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-field-1">{t("slug")} *</Label>
                <Input
                  id="project-field-1"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="bg-accent/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-field-51">
                    {t("summary")} (TR){mark}
                  </Label>
                  <Textarea
                    id="project-field-51"
                    value={summaryTr}
                    onChange={(e) => setSummaryTr(e.target.value)}
                    required={!isGithub}
                    placeholder={repoDescription}
                    className="bg-accent/30"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-field-52">
                    {t("summary")} (EN){mark}
                  </Label>
                  <Textarea
                    id="project-field-52"
                    value={summaryEn}
                    onChange={(e) => setSummaryEn(e.target.value)}
                    required={!isGithub}
                    placeholder={repoDescription}
                    className="bg-accent/30"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-field-2">GitHub URL</Label>
                  <Input
                    id="project-field-2"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="bg-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-field-3">Live URL ({t("liveSite")})</Label>
                  <Input
                    id="project-field-3"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    className="bg-accent/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("coverImage")}</Label>
                <ImageUpload value={logo} onChange={setLogo} folder="projects" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("description")} (TR)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={descriptionTr}
                label={`${t("description")} (TR)`}
                onChange={setDescriptionTr}
                placeholder="Projenizin tüm detaylarını buraya yazabilirsiniz..."
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("description")} (EN)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={descriptionEn}
                label={`${t("description")} (EN)`}
                onChange={setDescriptionEn}
                placeholder="You can write all project details here..."
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>
                {t("files")} ({t("optional")})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader files={files} onChange={setFiles} folder="projects" />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Durum ve Etiketler */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("status")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="project-field-4" checked={published} onCheckedChange={setPublished} />
                <Label htmlFor="project-field-4">{t("published")}</Label>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="project-field-5" checked={featured} onCheckedChange={setFeatured} />
                <Label htmlFor="project-field-5">{t("featured")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("technologies")}</CardTitle>
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
