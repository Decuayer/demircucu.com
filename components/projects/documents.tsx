"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ProjectDocumentView } from "@/lib/data/projects";

/** pdf.js is large; load it only when a document is opened. */
export const LazyPdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center rounded-xl border border-border/50 p-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Document list with an inline viewer for the selected one. */
export function ProjectDocuments({
  slug,
  documents,
}: {
  slug: string;
  documents: ProjectDocumentView[];
}) {
  const t = useTranslations("projects.documents");
  const viewable = documents.filter((d) => d.url);
  const [open, setOpen] = useState<string | null>(viewable[0]?.id ?? null);
  const current = documents.find((d) => d.id === open && d.url);

  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <div
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${doc.id === open ? "border-primary/40 bg-muted" : "border-border/50"}`}
            >
              <FileText className="h-4 w-4 shrink-0 text-link" />
              <div className="min-w-0 flex-1">
                {doc.url ? (
                  <button
                    type="button"
                    className="truncate text-left font-medium hover:underline"
                    onClick={() => setOpen(doc.id)}
                  >
                    {doc.title}
                  </button>
                ) : (
                  <span className="truncate font-medium">{doc.title}</span>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatSize(doc.size)}
                  {!doc.url && ` · ${t("tooLarge")}`}
                </p>
              </div>
              {doc.url ? (
                <Link
                  href={`/projects/${slug}/docs/${doc.id}`}
                  data-track="document"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("openPage")}
                </Link>
              ) : (
                <a
                  href={doc.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {current?.url && <LazyPdfViewer key={current.id} url={current.url} title={current.title} />}
    </div>
  );
}
