"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Errors in the locale layout itself. It replaces the whole document, so it has no i18n
 * provider: the text is shown in both languages.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="tr" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <title>Hata | Error — demircucu.com</title>
        <main role="alert" className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Bir şeyler ters gitti</h1>
          <p className="mb-6 text-muted-foreground" lang="en">
            Something went wrong
          </p>
          {error.digest && (
            <p className="mb-6 font-mono text-xs text-muted-foreground">{error.digest}</p>
          )}
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Tekrar dene / Try again
            </button>
            {/* A full reload: the client router may be the broken part. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium">
              Ana sayfa / Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
