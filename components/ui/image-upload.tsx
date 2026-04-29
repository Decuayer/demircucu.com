"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  usedIn?: string;
}

export function ImageUpload({ value, onChange, folder = "general", usedIn }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir görsel yükleyin.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Görsel boyutu 5MB'dan küçük olmalıdır.");
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
        onChange(data.url);
        toast.success("Görsel başarıyla yüklendi.");
      } else {
        throw new Error(data.error || "Yükleme başarısız.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleManualUrlSubmit = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setManualUrl("");
      setShowManual(false);
    }
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-accent/20 aspect-video flex items-center justify-center group max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={value} 
            alt="Uploaded image" 
            className="object-contain w-full h-full"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button 
              type="button" 
              variant="destructive" 
              size="icon" 
              onClick={() => onChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer
              ${dragActive ? "border-violet-500 bg-violet-500/10" : "border-border/50 hover:border-violet-500/50 hover:bg-accent/30"}
              ${isUploading ? "opacity-50 pointer-events-none" : ""}
            `}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUpload(e.target.files[0]);
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
                    Görsel yüklemek için tıklayın veya sürükleyin
                  </p>
                  <p className="text-xs opacity-70">
                    PNG, JPG, WEBP (Max 5MB)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px bg-border/50 flex-1"></div>
            <span className="text-xs text-muted-foreground uppercase">veya</span>
            <div className="h-px bg-border/50 flex-1"></div>
          </div>

          {showManual ? (
            <div className="flex gap-2">
              <Input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://..."
                className="bg-accent/30 flex-1"
              />
              <Button type="button" onClick={handleManualUrlSubmit} className="bg-secondary text-secondary-foreground">
                Ekle
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowManual(false)}>
                İptal
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full border-border/50 text-muted-foreground"
              onClick={() => setShowManual(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              URL ile görsel ekle
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
