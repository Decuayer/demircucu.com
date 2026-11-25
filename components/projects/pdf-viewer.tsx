"use client";

// Before pdf.js: built-ins it calls without polyfilling (Safari lacks async-iterable streams).
import "@/lib/pdf/polyfills.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewerBoundary } from "./viewer-boundary";

// Same origin (scripts/copy-pdfjs-assets.mjs): CSP allows workers and fetches from 'self' only.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

/**
 * PDF.js viewer (react-pdf): page navigation, zoom, full screen and download. pdf.js renders
 * to canvas, so it works on iOS Safari where an <iframe> preview does not.
 */
export default function PdfViewer({ url, title }: { url: string; title: string }) {
  const t = useTranslations("projects.pdf");
  const container = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState<number>();
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);

  const options = useMemo(
    () => ({
      isEvalSupported: false, // no `new Function` (CSP has no 'unsafe-eval')
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      cMapUrl: "/pdfjs/cmaps/",
      wasmUrl: "/pdfjs/wasm/",
    }),
    [],
  );

  // Fit the page to the container width (mobile friendly); zoom multiplies it.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.min(entry.contentRect.width - 2, 1000));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const element = container.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      /* not allowed (iOS Safari for non-video elements) */
    }
  }, []);

  const go = (delta: number) => setPage((p) => Math.min(Math.max(1, p + delta), pages || 1));
  const zoom = (factor: number) =>
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(s * factor * 100) / 100)));

  const failure = (
    <p className="p-6 text-center text-sm text-muted-foreground">
      {t("failed")}{" "}
      <a href={url} className="underline" target="_blank" rel="noopener noreferrer">
        {t("download")}
      </a>
    </p>
  );

  return (
    <div
      ref={container}
      className="pdf-viewer flex flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/30"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-background/80 p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => go(-1)}
            disabled={page <= 1}
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center text-sm tabular-nums" aria-live="polite">
            {pages ? t("pageOf", { page, pages }) : "…"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => go(1)}
            disabled={!pages || page >= pages}
            aria-label={t("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoom(1 / 1.25)}
            disabled={scale <= MIN_SCALE}
            aria-label={t("zoomOut")}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoom(1.25)}
            disabled={scale >= MAX_SCALE}
            aria-label={t("zoomIn")}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <a
            href={url}
            download
            data-track="document"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("download")}
          >
            <Button variant="ghost" size="icon" tabIndex={-1}>
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
      <div
        className={`overflow-auto p-2 ${fullscreen ? "flex-1" : "max-h-[80vh]"}`}
        tabIndex={0}
        aria-label={title}
      >
        {failed ? (
          failure
        ) : (
          <ViewerBoundary key={url} fallback={failure}>
            <Document
              file={url}
              options={options}
              onLoadSuccess={({ numPages }) => {
                setPages(numPages);
                setPage(1);
              }}
              onLoadError={() => setFailed(true)}
              loading={
                <div className="flex justify-center p-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              className="flex justify-center"
            >
              <Page pageNumber={page} width={width} scale={scale} className="shadow-md" />
            </Document>
          </ViewerBoundary>
        )}
      </div>
    </div>
  );
}
