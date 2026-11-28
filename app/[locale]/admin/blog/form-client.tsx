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
import type { AdminPost } from "@/lib/types/content";
import { toAttachments, type Attachment } from "@/lib/media/attachments";
import { ImageUpload } from "@/components/ui/image-upload";
import { createBlogPost, updateBlogPost } from "@/app/actions/admin";
import { useTranslations } from "next-intl";
import {
  UnsavedBadge,
  useFormBaseline,
  useUnsavedChanges,
} from "@/components/admin/unsaved-changes";

interface BlogFormClientProps {
  initialData?: AdminPost | null;
  tagOptions: TagOption[];
  isEdit?: boolean;
}

export default function BlogFormClient({
  initialData,
  tagOptions: initialTagOptions,
  isEdit,
}: BlogFormClientProps) {
  const t = useTranslations("admin");
  const errorMessage = useActionErrorMessage();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [titleTr, setTitleTr] = useState(initialData?.titleTr || "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverPath || "");
  const [excerptTr, setExcerptTr] = useState(initialData?.excerptTr || "");
  const [excerptEn, setExcerptEn] = useState(initialData?.excerptEn || "");
  const [contentTr, setContentTr] = useState(initialData?.contentTr || "");
  const [contentEn, setContentEn] = useState(initialData?.contentEn || "");
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

  const payload = {
    titleTr,
    titleEn,
    slug,
    excerptTr,
    excerptEn,
    contentTr,
    contentEn,
    coverPath: coverImage,
    published,
    featured,
    ...toTagPayload(tags),
    filesList: files,
  };
  const { dirty } = useFormBaseline(payload);
  const { confirmLeave, leave } = useUnsavedChanges(dirty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleTr || !titleEn || !slug || !excerptTr || !excerptEn || !contentTr || !contentEn) {
      toast.error("Lütfen zorunlu alanları (TR ve EN) doldurun.");
      return;
    }

    startTransition(async () => {
      let res;
      if (isEdit && initialData?.id) {
        res = await updateBlogPost(initialData.id, payload);
      } else {
        res = await createBlogPost(payload);
      }

      if (res.error) {
        toast.error(errorMessage(res.error));
      } else {
        toast.success(isEdit ? t("blogUpdated") : t("blogCreated"));
        leave(() => router.push(`/${locale}/admin/blog`));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? t("editBlog") : t("addBlog")}</h1>
        <div className="flex items-center gap-3">
          <UnsavedBadge dirty={dirty} />
          <Button type="button" variant="outline" onClick={() => confirmLeave(() => router.back())}>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="blog-field-1">{t("blogTitle")} (TR) *</Label>
                  <Input
                    id="blog-field-1"
                    value={titleTr}
                    onChange={(e) => setTitleTr(e.target.value)}
                    required
                    className="bg-accent/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-field-2">{t("blogTitle")} (EN) *</Label>
                  <Input
                    id="blog-field-2"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    required
                    className="bg-accent/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-field-3">URL Slug *</Label>
                <Input
                  id="blog-field-3"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="bg-accent/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="blog-field-4">{t("summary")} (TR) *</Label>
                  <Textarea
                    id="blog-field-4"
                    value={excerptTr}
                    onChange={(e) => setExcerptTr(e.target.value)}
                    required
                    className="bg-accent/30"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-field-5">{t("summary")} (EN) *</Label>
                  <Textarea
                    id="blog-field-5"
                    value={excerptEn}
                    onChange={(e) => setExcerptEn(e.target.value)}
                    required
                    className="bg-accent/30"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t("coverImageBlog")} ({t("optional")})
                </Label>
                <ImageUpload value={coverImage} onChange={setCoverImage} folder="blog" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("contentBlog")} (TR) *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={contentTr}
                label={`${t("contentBlog")} (TR)`}
                onChange={setContentTr}
                placeholder={t("blogContentPlaceholder")}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("contentBlog")} (EN) *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={contentEn}
                label={`${t("contentBlog")} (EN)`}
                onChange={setContentEn}
                placeholder={t("blogContentPlaceholder")}
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
              <FileUploader files={files} onChange={setFiles} folder="blog" />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Durum ve Etiketler */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("publishStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="blog-field-6" checked={published} onCheckedChange={setPublished} />
                <Label htmlFor="blog-field-6">{t("published")}</Label>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="blog-field-7" checked={featured} onCheckedChange={setFeatured} />
                <Label htmlFor="blog-field-7">{t("featured")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>{t("categoriesAndTags")}</CardTitle>
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
