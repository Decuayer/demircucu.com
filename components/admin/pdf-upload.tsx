"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { mediaUrl } from "@/lib/media/url";
import { uploadToMediaLibrary, type UploadFolder } from "@/lib/media/upload-client";

interface PdfUploadProps {
  /** Input id, for the field's `<Label htmlFor>`. */
  id: string;
  /** Storage path in the media bucket, or "" for none. */
  value: string;
  onChange: (path: string) => void;
  folder?: UploadFolder;
}

/** Uploads one PDF to the media library and returns its storage path (used for the CV). */
export function PdfUpload({ id, value, onChange, folder = "settings" }: PdfUploadProps) {
  const t = useTranslations("uploader");
  const errorMessage = useActionErrorMessage();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = mediaUrl(value);
  const name = value.split("/").pop() ?? value;

  const upload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error(t("notAPdf"));
      return;
    }
    setIsUploading(true);
    const result = await uploadToMediaLibrary(file, folder);
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.ok) {
      onChange(result.path);
      toast.success(t("fileUploaded"));
    } else {
      toast.error(errorMessage(result.error));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-accent/30 p-3">
      <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm" data-testid={`${id}-name`}>
        {value ? name : t("noPdf")}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={t("openPdf")}
          title={t("openPdf")}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1 h-3.5 w-3.5" />
        )}
        {isUploading ? t("uploading") : value ? t("replacePdf") : t("choosePdf")}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onChange("")}
          aria-label={t("remove")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
