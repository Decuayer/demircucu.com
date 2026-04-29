"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileIcon, Plus, Trash2, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export interface FileAttachment {
  name: string;
  url: string;
}

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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
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
            className={`
              border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer
              ${isUploading ? "opacity-50 pointer-events-none border-border/50" : "border-border/50 hover:border-violet-500/50 hover:bg-accent/30"}
            `}
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
                  <div className="p-3 bg-background rounded-full shadow-sm mb-2">
                    <Upload className="h-6 w-6 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium">
                    Dosya seçmek için tıklayın
                  </p>
                  <p className="text-xs opacity-70">
                    PDF, DOC, ZIP, vb. (Max 5MB)
                  </p>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 border border-border/50 rounded-xl bg-accent/10">
            <div className="md:col-span-5 space-y-2">
              <Label>Dosya Adı</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Örn: Proje Sunumu (PDF)" 
                className="bg-background"
              />
            </div>
            <div className="md:col-span-5 space-y-2">
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
                <Plus className="w-4 h-4 mr-2" /> Ekle
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {files.length > 0 && (
        <div className="space-y-2 mt-6 border border-border/50 rounded-lg p-3 bg-card/30">
          <Label className="text-muted-foreground mb-2 block">Ekli Dosyalar:</Label>
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-md bg-accent/20 border border-border/50">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon className="w-4 h-4 text-violet-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleRemove(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
