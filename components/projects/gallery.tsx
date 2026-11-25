"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GalleryImage } from "@/lib/data/projects";

/** Grid of the README's mirrored images with a lightbox. */
export function ProjectGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("projects.gallery");
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : images[index];
  const step = (delta: number) =>
    setIndex((i) => (i === null ? null : (i + delta + images.length) % images.length));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setIndex(i)}
            className="group overflow-hidden rounded-lg border border-border/50 bg-muted/30"
            aria-label={t("open", { name: image.alt })}
          >
            <span className="relative block aspect-video">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                {...(image.blurDataUrl
                  ? { placeholder: "blur" as const, blurDataURL: image.blurDataUrl }
                  : {})}
                className="object-cover transition-transform group-hover:scale-105"
              />
            </span>
          </button>
        ))}
      </div>
      <Dialog open={current !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          className="max-w-[95vw] border-border/50 bg-background/95 p-2 sm:max-w-5xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
        >
          <DialogTitle className="sr-only">{current?.alt ?? t("title")}</DialogTitle>
          {current && (
            <div className="relative flex items-center justify-center">
              {current.width && current.height ? (
                <Image
                  src={current.src}
                  alt={current.alt}
                  width={current.width}
                  height={current.height}
                  sizes="(min-width: 1024px) 1024px, 95vw"
                  className="max-h-[85vh] w-auto object-contain"
                />
              ) : (
                <span className="relative block aspect-video w-[90vw] max-w-5xl">
                  <Image
                    src={current.src}
                    alt={current.alt}
                    fill
                    sizes="95vw"
                    className="object-contain"
                  />
                </span>
              )}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2"
                    onClick={() => step(-1)}
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2"
                    onClick={() => step(1)}
                    aria-label={t("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
