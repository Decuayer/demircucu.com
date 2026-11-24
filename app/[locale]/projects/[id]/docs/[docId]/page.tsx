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
  return { title: `${result.document.title} · ${getTranslated(result.project, "title", locale)}` };
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
  const t = await getTranslations({ locale, namespace: "projects" });

  return (
    <div className="py-12 md:py-16">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 md:px-6">
        <Link href={`/projects/${project.slug}`}>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslated(project, "title", locale)}
          </Button>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold break-words md:text-3xl">{document.title}</h1>
          <a
            href={document.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("viewGithub")} <ExternalLink className="h-3.5 w-3.5" />
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
