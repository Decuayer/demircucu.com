"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Code2,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { GithubIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { deleteProject } from "@/app/actions/admin";
import {
  moveProject,
  setProjectFlags,
  startGithubSync,
  updateGithubSyncSettings,
} from "@/app/actions/github";
import type { AdminGithubOverview, AdminProjectRow } from "@/lib/data/admin";

interface AdminProjectsClientProps {
  initialProjects: AdminProjectRow[];
  github: AdminGithubOverview;
}

const POLL_MS = 3000;

export default function AdminProjectsClient({ initialProjects, github }: AdminProjectsClientProps) {
  const t = useTranslations("admin");
  const g = useTranslations("admin.github");
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [settings, setSettings] = useState(github.settings);
  const projects = initialProjects;
  const running = github.runs.some((r) => r.status === "RUNNING");
  const dateLocale = locale === "tr" ? tr : enUS;
  const ago = (date: Date | string | null) =>
    date ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateLocale }) : "—";

  // While a run is in progress, refresh the server data (run list, project statuses).
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, router]);

  const act = (
    fn: () => Promise<{ error?: Parameters<typeof errorMessage>[0] }>,
    success?: string,
  ) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error)
        toast.error(res.error === "conflict" ? g("alreadyRunning") : errorMessage(res.error));
      else if (success) toast.success(success);
      router.refresh();
    });

  const sync = (projectId?: string, force?: boolean) =>
    act(() => startGithubSync({ projectId, force }), g("started"));

  const saveSettings = (next: typeof settings) => {
    setSettings(next);
    act(
      () =>
        updateGithubSyncSettings({
          includeForks: next.includeForks,
          includeArchived: next.includeArchived,
        }),
      g("settingsSaved"),
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    act(async () => {
      const res = await deleteProject(deleteId);
      setDeleteId(null);
      return res;
    }, t("projectDeleted"));
  };

  const lastRun = github.runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <Code2 className="h-6 w-6 text-cyan-400" />
          {t("projects")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => sync()} disabled={isPending || running}>
            <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? g("running") : g("syncAll")}
          </Button>
          <Link href="/admin/projects/new">
            <Button className="border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t("add")}
            </Button>
          </Link>
        </div>
      </div>

      {/* GitHub sync panel */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <GithubIcon className="h-4 w-4" />
            <span className="font-semibold">{g("title")}</span>
            <Badge variant={github.config.auth === "anonymous" ? "destructive" : "secondary"}>
              {g(`auth.${github.config.auth}`)}
            </Badge>
            <Badge variant={github.config.webhook ? "secondary" : "outline"}>
              {github.config.webhook ? g("webhookOn") : g("webhookOff")}
            </Badge>
            <Badge variant={github.config.cron ? "secondary" : "outline"}>
              {github.config.cron ? g("cronOn") : g("cronOff")}
            </Badge>
            {lastRun && (
              <span className="text-muted-foreground">
                {g("lastRun", {
                  when: ago(lastRun.startedAt),
                  status: g(`status.${lastRun.status}`),
                })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Switch
                id="include-forks"
                checked={settings.includeForks}
                onCheckedChange={(v) => saveSettings({ ...settings, includeForks: v })}
              />
              <Label htmlFor="include-forks">{g("includeForks")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="include-archived"
                checked={settings.includeArchived}
                onCheckedChange={(v) => saveSettings({ ...settings, includeArchived: v })}
              />
              <Label htmlFor="include-archived">{g("includeArchived")}</Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {g("policy", { date: new Date(settings.autoPublishAfter).toLocaleDateString(locale) })}
          </p>
          {github.runs.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{g("runs")}</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3">{g("run.started")}</th>
                      <th className="py-1 pr-3">{g("run.trigger")}</th>
                      <th className="py-1 pr-3">{g("run.scope")}</th>
                      <th className="py-1 pr-3">{g("run.status")}</th>
                      <th className="py-1 pr-3">{g("run.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {github.runs.map((run) => {
                      const s = run.stats ?? {};
                      const failures = Array.isArray(s.failures)
                        ? (s.failures as { repo: string; error: string }[])
                        : [];
                      return (
                        <tr key={run.id} className="border-t border-border/50 align-top">
                          <td className="py-1 pr-3 whitespace-nowrap">{ago(run.startedAt)}</td>
                          <td className="py-1 pr-3">{g(`trigger.${run.trigger}`)}</td>
                          <td className="py-1 pr-3">{run.scope ?? g("allRepos")}</td>
                          <td className="py-1 pr-3">{g(`status.${run.status}`)}</td>
                          <td className="py-1 pr-3">
                            {run.stats &&
                              g("run.summary", {
                                created: Number(s.created ?? 0),
                                updated: Number(s.updated ?? 0),
                                unchanged: Number(s.unchanged ?? 0),
                                failed: Number(s.failed ?? 0),
                                remaining: Number(s.remaining ?? 0),
                              })}
                            {run.error && (
                              <span className="block text-destructive">{run.error}</span>
                            )}
                            {failures.map((f) => (
                              <span key={f.repo} className="block text-destructive">
                                {f.repo}: {f.error}
                              </span>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {projects.map((project, i) => {
          const title = locale === "tr" ? project.displayTitleTr : project.displayTitleEn;
          const isGithub = project.source === "GITHUB";
          return (
            <Card key={project.id} className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isPending || i === 0}
                    onClick={() => act(() => moveProject(project.id, "up"))}
                    aria-label={g("moveUp")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isPending || i === projects.length - 1}
                    onClick={() => act(() => moveProject(project.id, "down"))}
                    aria-label={g("moveDown")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{title}</h3>
                    <Badge variant="outline" className="gap-1 text-xs">
                      {isGithub ? <GithubIcon className="h-3 w-3" /> : null}
                      {isGithub ? g("sourceGithub") : g("sourceManual")}
                    </Badge>
                    <Badge
                      variant={project.published ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {project.published ? t("published") : t("unpublished")}
                    </Badge>
                    {project.featured && (
                      <Badge
                        variant="outline"
                        className="border-yellow-400/30 text-xs text-yellow-400"
                      >
                        {t("featured")}
                      </Badge>
                    )}
                    {project.isArchived && (
                      <Badge variant="outline" className="text-xs">
                        {g("archived")}
                      </Badge>
                    )}
                    {project.syncStatus === "ERROR" && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        {project.syncError === "repoUnavailable"
                          ? g("repoUnavailable")
                          : g("syncError")}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    /{project.slug}
                    {project.githubFullName && ` · ${project.githubFullName}`}
                    {isGithub && ` · ${g("syncedAgo", { when: ago(project.lastSyncedAt) })}`}
                    {project._count.documents > 0 && (
                      <span className="ml-1 inline-flex items-center gap-0.5">
                        · <FileText className="h-3 w-3" /> {project._count.documents}
                      </span>
                    )}
                  </p>
                  {project.syncStatus === "ERROR" &&
                    project.syncError &&
                    project.syncError !== "repoUnavailable" && (
                      <p className="text-xs break-all text-destructive">{project.syncError}</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                    onClick={() =>
                      act(() => setProjectFlags(project.id, { published: !project.published }))
                    }
                    aria-label={project.published ? t("unpublish") : t("publish")}
                    title={project.published ? t("unpublish") : t("publish")}
                  >
                    {project.published ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                    onClick={() =>
                      act(() => setProjectFlags(project.id, { featured: !project.featured }))
                    }
                    aria-label={t("featured")}
                    title={t("featured")}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${project.featured ? "fill-yellow-400 text-yellow-400" : ""}`}
                    />
                  </Button>
                  {isGithub && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isPending}
                        onClick={() => sync(project.id)}
                        aria-label={g("syncOne")}
                        title={g("syncOne")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isPending}
                        onClick={() => sync(project.id, true)}
                        aria-label={g("reprocess")}
                        title={g("reprocess")}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Link href={`/admin/projects/${project.id}/edit`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("edit")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {/* GitHub projects come back on the next sync; they are unpublished instead. */}
                  {!isGithub && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(project.id)}
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmation")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
