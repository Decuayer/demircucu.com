"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { listLibraryImages, type LibraryImage } from "@/app/actions/media";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { mediaUrl } from "@/lib/media/url";
import { uploadToMediaLibrary, type UploadFolder } from "@/lib/media/upload-client";

export interface PickedImage {
  src: string;
  alt: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (image: PickedImage) => void;
  /** Folder for images uploaded from the picker. */
  folder?: UploadFolder;
}

/**
 * Picks an image of the media library (or uploads a new one) for the rich text editor. Only
 * images of our own bucket can be inserted: the sanitizer and the CSP allow nothing else.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  folder = "media-library",
}: MediaPickerDialogProps) {
  const t = useTranslations("mediaPicker");
  const errorMessage = useActionErrorMessage();
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || images) return;
    let active = true;
    void listLibraryImages().then((result) => {
      if (!active) return;
      if (result.success) setImages(result.images);
      else {
        setImages([]);
        toast.error(errorMessage(result.error));
      }
    });
    return () => {
      active = false;
    };
  }, [open, images, errorMessage]);

  const pick = (image: Pick<LibraryImage, "name" | "path">) => {
    const src = mediaUrl(image.path);
    if (!src) return;
    onPick({ src, alt: image.name.replace(/\.[a-z0-9]+$/i, "") });
    onOpenChange(false);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const result = await uploadToMediaLibrary(file, folder);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    setImages(null);
    pick(result.file);
  };

  const needle = query.trim().toLocaleLowerCase();
  const visible = (images ?? []).filter((i) => i.name.toLocaleLowerCase().includes(needle));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-background sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="min-w-48 flex-1"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {t("upload")}
          </Button>
        </div>
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {images === null ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </p>
          ) : visible.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            visible.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => pick(image)}
                title={image.name}
                aria-label={t("insert", { name: image.name })}
                className="group overflow-hidden rounded-lg border border-border/50 bg-accent/20 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="relative block aspect-square">
                  <Image
                    src={mediaUrl(image.path) ?? ""}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 180px, 45vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </span>
                <span className="block truncate px-2 py-1 text-xs">{image.name}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
