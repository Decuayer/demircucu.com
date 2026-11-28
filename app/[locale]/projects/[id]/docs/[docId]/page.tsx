import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbs } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { seoContext } from "@/lib/seo/site";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/components/projects/document-viewer";
import { getProjectPage, getPublishedDocumentParams } from "@/lib/data/projects";
import { atLeastOne, EMPTY_PARAM_PLACEHOLDER } from "@/lib/data/static-params";
import { getTranslated } from "@/lib/i18n-utils";

export async function generateStaticParams() {
  return atLeastOne(await getPublishedDocumentParams(), {
    id: EMPTY_PARAM_PLACEHOLDER,
    docId: EMPTY_PARAM_PLACEHOLDER,
  });
}

async function load(slug: string, docId: string) {
  const result = await getProjectPage(slug);
  if (result.kind !== "found") return result;
  const document = result.project.documents.find((d) => d.id === docId);
  return document ? { ...result, document } : ({ kind: "notFound" } as const);
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[id]/docs/[docId]">): Promise<Metadata> {
  const { locale, id, docId } = await params;
  const result = await load(id, docId);
  if (result.kind !== "found") return {};
  const projectTitle = getTranslated(result.project, "title", locale);
  return pageMetadata({
    locale,
    path: `/projects/${result.project.slug}/docs/${docId}`,
    title: `${result.document.title} · ${projectTitle}`,
    description: getTranslated(result.project, "summary", locale),
    image: { path: `/projects/${result.project.slug}` },
  });
}

export default async function ProjectDocumentPage({
  params,
}: PageProps<"/[locale]/projects/[id]/docs/[docId]">) {
  const { locale, id, docId } = await params;
  const result = await load(id, docId);
  if (result.kind === "redirect") {
    permanentRedirect(getPathname({ locale, href: `/projects/${result.slug}/docs/${docId}` }));
  }
  if (result.kind === "notFound") notFound();
  const { project, document } = result;
  const [t, context] = await Promise.all([
    getTranslations({ locale, namespace: "projects" }),
    seoContext(locale),
  ]);
  const projectTitle = getTranslated(project, "title", locale);

  return (
    <div className="py-16 md:py-24">
      <JsonLd
        data={breadcrumbs(context.base, locale, [
          { name: t("title"), path: "/projects" },
          { name: projectTitle, path: `/projects/${project.slug}` },
          { name: document.title, path: `/projects/${project.slug}/docs/${docId}` },
        ])}
      />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 md:px-6">
        <Link href={`/projects/${project.slug}`}>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslated(project, "title", locale)}
          </Button>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h1 text-balance break-words">{document.title}</h1>
          <a
            href={document.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("viewGithub")} <ExternalLink aria-hidden className="h-4 w-4" />
          </a>
        </div>
        {document.url ? (
          <DocumentViewer url={document.url} title={document.title} />
        ) : (
          <p className="text-muted-foreground">{t("documents.tooLarge")}</p>
        )}
      </div>
    </div>
  );
}
