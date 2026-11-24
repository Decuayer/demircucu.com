"use client";

import { LazyPdfViewer } from "./documents";

/** Client boundary for the lazily loaded PDF viewer (server pages cannot use ssr: false). */
export function DocumentViewer({ url, title }: { url: string; title: string }) {
  return <LazyPdfViewer url={url} title={title} />;
}
