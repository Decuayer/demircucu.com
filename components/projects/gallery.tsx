"use client";

import { useState } from "react";
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
            {/* Mirrored files in our bucket; sizes come from the sync. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              loading="lazy"
              decoding="async"
              className="aspect-video h-auto w-full object-cover transition-transform group-hover:scale-105"
            />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt={current.alt}
                className="max-h-[85vh] w-auto object-contain"
              />
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
