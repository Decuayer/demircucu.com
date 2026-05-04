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
import { createBlogPost, updateBlogPost } from "@/app/actions/admin";

interface BlogFormClientProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function BlogFormClient({ initialData, isEdit }: BlogFormClientProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [titleTr, setTitleTr] = useState(initialData?.titleTr || "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [excerptTr, setExcerptTr] = useState(initialData?.excerptTr || "");
  const [excerptEn, setExcerptEn] = useState(initialData?.excerptEn || "");
  const [contentTr, setContentTr] = useState(initialData?.contentTr || "");
  const [contentEn, setContentEn] = useState(initialData?.contentEn || "");
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

    if (!titleTr || !titleEn || !slug || !excerptTr || !excerptEn || !contentTr || !contentEn) {
      toast.error("Lütfen zorunlu alanları (TR ve EN) doldurun.");
      return;
    }

    const payload = {
      titleTr,
      titleEn,
      slug,
      excerptTr,
      excerptEn,
      contentTr,
      contentEn,
      coverImage,
      published,
      featured,
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
        res = await updateBlogPost(initialData.id, payload);
      } else {
        res = await createBlogPost(payload);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isEdit ? "Yazı güncellendi." : "Yazı başarıyla eklendi.");
        router.push(`/${locale}/admin/blog`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? "Yazıyı Düzenle" : "Yeni Yazı Ekle"}</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>İptal</Button>
          <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Temel Bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Genel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yazı Başlığı (TR) *</Label>
                  <Input value={titleTr} onChange={e => setTitleTr(e.target.value)} required className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>Yazı Başlığı (EN) *</Label>
                  <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} required className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL Slug *</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} required className="bg-accent/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kısa Özet (TR) *</Label>
                  <Textarea value={excerptTr} onChange={e => setExcerptTr(e.target.value)} required className="bg-accent/30" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Kısa Özet (EN) *</Label>
                  <Textarea value={excerptEn} onChange={e => setExcerptEn(e.target.value)} required className="bg-accent/30" rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kapak Görseli (Opsiyonel)</Label>
                <ImageUpload value={coverImage} onChange={setCoverImage} folder="blog" usedIn={isEdit ? `blog:${initialData?.id}` : undefined} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Blog İçeriği (TR) *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={contentTr} onChange={setContentTr} placeholder="Blog yazınızı buraya oluşturun..." />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Blog İçeriği (EN) *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={contentEn} onChange={setContentEn} placeholder="Create your blog post here..." />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Ekli Dosyalar (Opsiyonel)</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader files={files} onChange={setFiles} folder="blog" usedIn={isEdit ? `blog:${initialData?.id}` : undefined} />
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon: Durum ve Etiketler */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Yayın Durumu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>Yayında (Görünür)</Label>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch checked={featured} onCheckedChange={setFeatured} />
                <Label>Öne Çıkan (Featured)</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Kategori ve Konular (Tags)</CardTitle>
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
