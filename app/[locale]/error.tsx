"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";

/** Unexpected errors in a page: the layout (header, footer) stays, the page offers a retry. */
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errorPages");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section
      role="alert"
      className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center"
    >
      <AlertTriangle aria-hidden className="mb-6 h-10 w-10 text-muted-foreground" />
      <h1 className="mb-4 text-h1 text-balance">{t("errorTitle")}</h1>
      <p className="mb-2 text-muted-foreground">{t("errorText")}</p>
      {error.digest && (
        <p className="mb-8 font-mono text-xs text-muted-foreground">
          {t("reference", { digest: error.digest })}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>{t("retry")}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("home")}
        </Link>
      </div>
    </section>
  );
}
