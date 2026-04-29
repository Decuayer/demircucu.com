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

interface ExperienceFormClientProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ExperienceFormClient({ initialData, isEdit }: ExperienceFormClientProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale;
  const [isPending, startTransition] = useTransition();

  // Form State
  const [company, setCompany] = useState(initialData?.company || "");
  const [position, setPosition] = useState(initialData?.position || "");
  const [logo, setLogo] = useState(initialData?.logo || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [details, setDetails] = useState(initialData?.details || "");
  const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "");
  const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "");
  const [published, setPublished] = useState(initialData?.published ?? true);

  // Tags (Mapping relations to string array)
  const [tags, setTags] = useState<string[]>(initialData?.tags?.map((t: any) => t.name) || []);

  // Files
  const [files, setFiles] = useState<FileAttachment[]>(initialData?.files || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !position || !description || !startDate) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }

    const payload = {
      company,
      position,
      logo,
      description,
      details,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      published,
      tagsList: tags,
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
        toast.success(isEdit ? "Deneyim güncellendi." : "Deneyim başarıyla eklendi.");
        router.push(`/${locale}/admin/experiences`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? "Deneyimi Düzenle" : "Yeni Deneyim Ekle"}</h1>
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
                  <Label>Şirket Adı *</Label>
                  <Input value={company} onChange={e => setCompany(e.target.value)} required className="bg-accent/30" />
                </div>
                <div className="space-y-2">
                  <Label>Pozisyon *</Label>
                  <Input value={position} onChange={e => setPosition(e.target.value)} required className="bg-accent/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Şirket Logosu (İsteğe Bağlı)</Label>
                <ImageUpload value={logo} onChange={setLogo} folder="experiences" usedIn={isEdit ? `experience:${initialData?.id}` : undefined} />
              </div>

              <div className="space-y-2">
                <Label>Kısa Açıklama (Listeleme sayfasında görünür) *</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} required className="bg-accent/30" rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Detaylı İçerik (Rich Text)</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={details} onChange={setDetails} placeholder="Görevlerinizi, başarılarınızı ve detayları buraya yazabilirsiniz..." />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Ekli Dosyalar</CardTitle>
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
              <CardTitle>Tarih & Durum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="bg-accent/30" />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Tarihi (Devam ediyorsa boş bırakın)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-accent/30" />
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t border-border/50">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>Yayında (Görünür)</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Etiketler (Tags)</CardTitle>
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
