"use client";

import { useTranslations } from "next-intl";
import { FileQuestion } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

/** 404 inside the site layout, in the page language (missing content and unknown paths). */
export default function NotFound() {
  const t = useTranslations("errorPages");
  return (
    <section className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <FileQuestion aria-hidden className="mb-6 h-10 w-10 text-muted-foreground" />
      <p className="mb-2 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mb-4 text-h1 text-balance">{t("notFoundTitle")}</h1>
      <p className="mb-8 text-muted-foreground">{t("notFoundText")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          {t("home")}
        </Link>
        <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
          {t("projects")}
        </Link>
        <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
          {t("blog")}
        </Link>
      </div>
    </section>
  );
}
