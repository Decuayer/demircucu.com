"use client";

import Image from "next/image";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { useState, useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format-date";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Image as ImageIcon,
  FileIcon,
  Trash2,
  Upload,
  Search,
  Copy,
  ExternalLink,
  Loader2,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminMediaItem } from "@/lib/data/admin";
import { mediaUrl } from "@/lib/media/url";
import { uploadToMediaLibrary } from "@/lib/media/upload-client";
import { deleteMediaFile } from "@/app/actions/media";
import { deleteUnusedGithubMedia } from "@/app/actions/github";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminMediaClientProps {
  initialFiles: AdminMediaItem[];
}

export default function AdminMediaClient({ initialFiles }: AdminMediaClientProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const errorMessage = useActionErrorMessage();
  const [files, setFiles] = useState<AdminMediaItem[]>(initialFiles);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "document">("all");
  const [filterSource, setFilterSource] = useState<"all" | "UPLOAD" | "GITHUB">("all");
  const [filterRepo, setFilterRepo] = useState("");
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const repos = [
    ...new Set(files.map((f) => f.repoFullName).filter((r): r is string => Boolean(r))),
  ].sort();
  // Garbage collection candidates: mirrored GitHub files nothing refers to any more.
  const unusedGithub = files.filter((f) => f.source === "GITHUB" && f.usageCount === 0);

  const [selectedFile, setSelectedFile] = useState<AdminMediaItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterSource !== "all" && file.source !== filterSource) return false;
    if (filterRepo && file.repoFullName !== filterRepo) return false;

    if (filterType === "image") return file.type.startsWith("image/");
    if (filterType === "document") return !file.type.startsWith("image/");
    return true;
  });

  // Handle direct upload from media page
  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const result = await uploadToMediaLibrary(file, "media-library");
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!result.ok) {
      toast.error(errorMessage(result.error));
      return;
    }
    setFiles((prev) => [
      {
        ...result.file,
        createdAt: new Date(result.file.createdAt),
        source: "UPLOAD",
        repoFullName: null,
        originUrl: null,
        usageCount: 0,
        usedIn: [],
      },
      ...prev.filter((f) => f.id !== result.file.id),
    ]);
    toast.success(t("fileUploaded"));
  };

  // Handle file deletion
  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      const res = await deleteMediaFile(deleteId);
      if (res.error) {
        toast.error(errorMessage(res.error));
      } else {
        toast.success(t("fileDeleted"));
        setFiles((prev) => prev.filter((f) => f.id !== deleteId));
        if (selectedFile?.id === deleteId) {
          setSelectedFile(null);
        }
      }
      setDeleteId(null);
    });
  };

  const handleCleanup = () =>
    startTransition(async () => {
      const ids = unusedGithub.map((f) => f.id);
      const res = await deleteUnusedGithubMedia(ids);
      if (res.error) toast.error(errorMessage(res.error));
      else {
        toast.success(t("cleanupDone", { count: res.deleted }));
        setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
      }
      setCleanupOpen(false);
    });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("urlCopied"));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="enter flex items-center gap-3 text-2xl font-bold">
          <ImageIcon className="h-6 w-6 text-violet-400" />
          {t("mediaLibrary")}
        </h1>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchFiles")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-accent/30 pl-9"
            />
          </div>
          <Button
            onClick={() => !isUploading && fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 whitespace-nowrap text-white"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? t("uploading") : t("uploadFile")}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleUpload(e.target.files[0]);
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-4">
        <Button
          variant={filterType === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("all")}
          className={
            filterType === "all" ? "bg-accent/50 text-foreground" : "text-muted-foreground"
          }
        >
          {t("all")}
        </Button>
        <Button
          variant={filterType === "image" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("image")}
          className={
            filterType === "image" ? "bg-accent/50 text-foreground" : "text-muted-foreground"
          }
        >
          {t("images")}
        </Button>
        <Button
          variant={filterType === "document" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterType("document")}
          className={
            filterType === "document" ? "bg-accent/50 text-foreground" : "text-muted-foreground"
          }
        >
          {t("documents")}
        </Button>
        <span className="mx-2 h-5 w-px bg-border" />
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
          aria-label={t("mediaSource")}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">{t("allSources")}</option>
          <option value="UPLOAD">{t("sourceUpload")}</option>
          <option value="GITHUB">{t("sourceGithub")}</option>
        </select>
        {repos.length > 0 && (
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            aria-label={t("mediaRepo")}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("allRepos")}</option>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        {unusedGithub.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setCleanupOpen(true)}
          >
            <Eraser className="mr-2 h-3.5 w-3.5" />
            {t("cleanupUnused", { count: unusedGithub.length })}
          </Button>
        )}
      </div>

      {/* Grid */}
      {filteredFiles.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border/50 bg-accent/10 py-20 text-center">
          <ImageIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">{t("noFilesFound")}</h3>
          <p className="text-sm text-muted-foreground">{t("noMatchingFiles")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredFiles.map((file, i) => (
            <div
              key={file.id}
              className="enter enter-scale"
              style={{ "--enter-delay": `${i * 50}ms` } as React.CSSProperties}
            >
              <Card
                className="group cursor-pointer overflow-hidden border-border/50 bg-card/50 transition-colors hover:border-violet-500/50"
                onClick={() => setSelectedFile(file)}
              >
                <div className="relative flex aspect-square items-center justify-center bg-accent/20 p-2">
                  {file.type.startsWith("image/") ? (
                    <span className="relative block h-full w-full">
                      <Image
                        src={mediaUrl(file.path) ?? ""}
                        alt={file.name}
                        fill
                        sizes="(min-width: 1024px) 200px, 45vw"
                        unoptimized={file.path.endsWith(".ico")}
                        className="rounded-md object-cover"
                      />
                    </span>
                  ) : (
                    <FileIcon className="h-12 w-12 text-cyan-400 opacity-80" />
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="h-8 text-xs">
                      <EyeIcon className="mr-2 h-3 w-3" /> {t("detail")}
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-xs font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(file.createdAt, locale)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="border-border/50 bg-background sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{t("fileDetails")}</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
              <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border/50 bg-accent/20 p-4">
                {selectedFile.type.startsWith("image/") ? (
                  <span className="relative block h-[300px] w-full">
                    <Image
                      src={mediaUrl(selectedFile.path) ?? ""}
                      alt={selectedFile.name}
                      fill
                      sizes="320px"
                      unoptimized={selectedFile.path.endsWith(".ico")}
                      className="rounded-md object-contain"
                    />
                  </span>
                ) : (
                  <FileIcon className="h-24 w-24 text-cyan-400" />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-lg leading-tight font-semibold break-words">
                    {selectedFile.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedFile.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(selectedFile.size)}
                      {selectedFile.width && selectedFile.height
                        ? ` · ${selectedFile.width}×${selectedFile.height}`
                        : ""}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedFile.source === "GITHUB" ? t("sourceGithub") : t("sourceUpload")}
                    </Badge>
                  </div>
                  {selectedFile.repoFullName && (
                    <p className="mt-2 text-xs break-all text-muted-foreground">
                      {selectedFile.repoFullName}
                      {selectedFile.originUrl && (
                        <>
                          {" · "}
                          <a
                            href={selectedFile.originUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {t("origin")}
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("publicUrl")}</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={mediaUrl(selectedFile.path) ?? ""}
                      className="h-8 bg-accent/30 text-xs"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(mediaUrl(selectedFile.path) ?? "")}
                      aria-label={t("copyUrl")}
                      title={t("copyUrl")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a
                      href={mediaUrl(selectedFile.path) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "icon",
                        className: "h-8 w-8 shrink-0",
                      })}
                      aria-label={t("openFile")}
                      title={t("openFile")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("uploadDate")}</Label>
                  <p className="text-sm">
                    {formatDate(selectedFile.createdAt, locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("usedIn")}</Label>
                  <p className="inline-block rounded-md border border-border/50 bg-accent/30 px-3 py-1.5 text-sm">
                    {t("usageCount", { count: selectedFile.usageCount })}
                  </p>
                  {selectedFile.usedIn.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {selectedFile.usedIn.map((u, i) => (
                        <li key={i}>
                          {t(`usage.${u.kind.replace(":", "_")}`)} · {u.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 border-t border-border/50 pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setDeleteId(selectedFile.id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteFile")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Garbage collection of unused GitHub mirrors */}
      <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cleanupTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cleanupConfirmation", { count: unusedGithub.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-48 overflow-y-auto text-xs text-muted-foreground">
            {unusedGithub.map((f) => (
              <li key={f.id} className="truncate">
                {f.repoFullName} · {f.name} ({formatSize(f.size)})
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteFileConfirmation")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? t("deleting") : t("deleteFile")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper icon component since Eye isn't imported above to avoid conflict
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
