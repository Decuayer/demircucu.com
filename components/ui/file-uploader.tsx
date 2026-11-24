"use client";

import { MAX_UPLOAD_BYTES } from "@/lib/upload/policy";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileIcon, Plus, Trash2, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { FileAttachment } from "@/lib/types/content";

export type { FileAttachment };

interface FileUploaderProps {
  files: FileAttachment[];
  onChange: (files: FileAttachment[]) => void;
  folder?: string;
  usedIn?: string;
}

export function FileUploader({ files, onChange, folder = "general", usedIn }: FileUploaderProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddUrl = () => {
    if (name.trim() && url.trim()) {
      onChange([...files, { name: name.trim(), url: url.trim() }]);
      setName("");
      setUrl("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Dosya boyutu 4MB'dan küçük olmalıdır.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      if (usedIn) formData.append("usedIn", usedIn);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onChange([...files, { name: file.name, url: data.url }]);
        toast.success("Dosya başarıyla yüklendi.");
      } else {
        throw new Error(data.error || "Yükleme başarısız.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Dosya Yükle
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            URL Ekle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${isUploading ? "pointer-events-none border-border/50 opacity-50" : "border-border/50 hover:border-violet-500/50 hover:bg-accent/30"} `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUpload(e.target.files[0]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />

            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <p className="text-sm font-medium">Yükleniyor...</p>
                </>
              ) : (
                <>
                  <div className="mb-2 rounded-full bg-background p-3 shadow-sm">
                    <Upload className="h-6 w-6 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium">Dosya seçmek için tıklayın</p>
                  <p className="text-xs opacity-70">
                    PNG, JPG, GIF, WEBP, AVIF, ICO, PDF (Max 4MB)
                  </p>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-0">
          <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border/50 bg-accent/10 p-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-5">
              <Label>Dosya Adı</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Proje Sunumu (PDF)"
                className="bg-background"
              />
            </div>
            <div className="space-y-2 md:col-span-5">
              <Label>Dosya Linki (URL)</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="bg-background"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                onClick={handleAddUrl}
                disabled={!name.trim() || !url.trim()}
                className="w-full bg-secondary text-secondary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" /> Ekle
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {files.length > 0 && (
        <div className="mt-6 space-y-2 rounded-lg border border-border/50 bg-card/30 p-3">
          <Label className="mb-2 block text-muted-foreground">Ekli Dosyalar:</Label>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-border/50 bg-accent/20 p-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon className="h-4 w-4 shrink-0 text-violet-400" />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{file.url}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                onClick={() => handleRemove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
