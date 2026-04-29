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
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);

  // Tags (Mapping relations to string array)
  const [tags, setTags] = useState<string[]>(initialData?.tags?.map((t: any) => t.name) || []);

  // Files
  const [files, setFiles] = useState<FileAttachment[]>(initialData?.files || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !slug || !excerpt || !content) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }

    const payload = {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      published,
      featured,
      tagsList: tags,
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yazı Başlığı *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} required className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug *</Label>
                  <Input value={slug} onChange={e => setSlug(e.target.value)} required className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kısa Özet (Ana sayfada görünür) *</Label>
                <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} required className="bg-accent/30" rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Kapak Görseli (Opsiyonel)</Label>
                <ImageUpload value={coverImage} onChange={setCoverImage} folder="blog" usedIn={isEdit ? `blog:${initialData?.id}` : undefined} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Blog İçeriği (Rich Text) *</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={content} onChange={setContent} placeholder="Blog yazınızı buraya oluşturun..." />
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
