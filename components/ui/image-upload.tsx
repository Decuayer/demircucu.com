"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { mediaUrl } from "@/lib/media/url";
import { uploadToMediaLibrary, type UploadFolder } from "@/lib/media/upload-client";

interface ImageUploadProps {
  /** Storage path in the media bucket, or "" for none. */
  value: string;
  onChange: (path: string) => void;
  folder?: UploadFolder;
}

/** Uploads an image to the media library and returns its storage path. */
export function ImageUpload({ value, onChange, folder = "general" }: ImageUploadProps) {
  const t = useTranslations("uploader");
  const errorMessage = useActionErrorMessage();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = mediaUrl(value);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("notAnImage"));
      return;
    }
    setIsUploading(true);
    const result = await uploadToMediaLibrary(file, folder);
    setIsUploading(false);
    if (result.ok) {
      onChange(result.path);
      toast.success(t("imageUploaded"));
    } else {
      toast.error(errorMessage(result.error));
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  };

  if (value) {
    return (
      <div className="group relative flex aspect-video max-w-sm items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-accent/20">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt={t("previewAlt")}
            fill
            sizes="384px"
            unoptimized={previewUrl.endsWith(".ico")}
            className="object-contain"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={t("remove")}
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragActive ? "border-primary bg-muted" : "border-border/50 hover:border-primary/40 hover:bg-accent/30"} ${isUploading ? "pointer-events-none opacity-50" : ""}`}
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
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-link" />
            <p className="text-sm font-medium">{t("uploading")}</p>
          </>
        ) : (
          <>
            <div className="mb-2 rounded-full bg-background p-3 shadow-sm">
              <Upload className="h-6 w-6 text-link" />
            </div>
            <p className="text-sm font-medium">{t("imageDropHint")}</p>
            <p className="text-xs">{t("imageTypes")}</p>
          </>
        )}
      </div>
    </div>
  );
}
