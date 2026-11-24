"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileIcon, Link as LinkIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { attachmentHref, type Attachment } from "@/lib/media/attachments";
import { uploadToMediaLibrary, type UploadFolder } from "@/lib/media/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload/policy";

interface FileUploaderProps {
  files: Attachment[];
  onChange: (files: Attachment[]) => void;
  folder?: UploadFolder;
}

/** Attachment list: files uploaded to the media library (path) or external links (url). */
export function FileUploader({ files, onChange, folder = "general" }: FileUploaderProps) {
  const t = useTranslations("uploader");
  const errorMessage = useActionErrorMessage();
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

  const handleUpload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(errorMessage("tooLarge"));
      return;
    }
    setIsUploading(true);
    const result = await uploadToMediaLibrary(file, folder);
    setIsUploading(false);
    if (result.ok) {
      onChange([...files, { name: file.name, path: result.path }]);
      toast.success(t("fileUploaded"));
    } else {
      toast.error(errorMessage(result.error));
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t("uploadTab")}
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {t("linkTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${isUploading ? "pointer-events-none border-border/50 opacity-50" : "border-border/50 hover:border-violet-500/50 hover:bg-accent/30"}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <p className="text-sm font-medium">{t("uploading")}</p>
                </>
              ) : (
                <>
                  <div className="mb-2 rounded-full bg-background p-3 shadow-sm">
                    <Upload className="h-6 w-6 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium">{t("fileDropHint")}</p>
                  <p className="text-xs opacity-70">{t("fileTypes")}</p>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-0">
          <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border/50 bg-accent/10 p-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-5">
              <Label>{t("linkName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("linkNamePlaceholder")}
                className="bg-background"
              />
            </div>
            <div className="space-y-2 md:col-span-5">
              <Label>{t("linkUrl")}</Label>
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
                <Plus className="mr-2 h-4 w-4" /> {t("add")}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {files.length > 0 && (
        <div className="mt-6 space-y-2 rounded-lg border border-border/50 bg-card/30 p-3">
          <Label className="mb-2 block text-muted-foreground">{t("attached")}</Label>
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-border/50 bg-accent/20 p-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon className="h-4 w-4 shrink-0 text-violet-400" />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {attachmentHref(file) ?? ("path" in file ? file.path : "")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("remove")}
                className="shrink-0 text-destructive"
                onClick={() => onChange(files.filter((_, index) => index !== i))}
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
