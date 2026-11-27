"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, EyeOff, Plus, X } from "lucide-react";
import type { TagKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { ParentOptions, selectClass, TagCreateDialog } from "@/components/admin/tag-create-dialog";
import {
  addTagAlias,
  deleteTag,
  mergeTag,
  removeTagAlias,
  reorderTag,
  updateTag,
} from "@/app/actions/tags";
import type { ActionResult } from "@/lib/actions/result";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { AdminTag } from "@/lib/data/admin";
import { TAG_KINDS } from "@/lib/tags/kinds";
import { searchTagOptions, tagPath } from "@/lib/tags/options";

interface Row {
  tag: AdminTag;
  depth: number;
}

/** Depth-first rows of the tag tree (siblings by order, then name). */
function treeRows(tags: readonly AdminTag[]): Row[] {
  const children = new Map<string | null, AdminTag[]>();
  const ids = new Set(tags.map((t) => t.id));
  for (const tag of tags) {
    const parent = tag.parentId && ids.has(tag.parentId) ? tag.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), tag]);
  }
  const rows: Row[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const list = (children.get(parentId) ?? []).sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name),
    );
    for (const tag of list) {
      rows.push({ tag, depth });
      walk(tag.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

function descendantIds(tags: readonly AdminTag[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const tag of tags) if (tag.parentId === out[i]) out.push(tag.id);
  }
  return out;
}

const total = (tag: AdminTag) => tag.usage.projects + tag.usage.experiences + tag.usage.posts;

export default function AdminTagsClient({ tags }: { tags: AdminTag[] }) {
  const t = useTranslations("tags");
  const router = useRouter();
  const errorMessage = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => treeRows(tags), [tags]);
  const matches = useMemo(
    () =>
      query.trim() ? new Set(searchTagOptions(tags, query, tags.length).map((t) => t.id)) : null,
    [tags, query],
  );
  const selected = tags.find((tag) => tag.id === selectedId) ?? null;

  const run = (action: () => Promise<ActionResult>, success?: string, after?: () => void) =>
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast.error(errorMessage(res.error));
        return;
      }
      if (success) toast.success(success);
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("adminTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminHint")}</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("newTag")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="border-border/50 bg-card/50 lg:col-span-3">
          <CardHeader className="space-y-3">
            <CardTitle>{t("tree", { count: tags.length })}</CardTitle>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
            />
          </CardHeader>
          <CardContent>
            <ul
              className="divide-y divide-border/40"
              aria-label={t("tree", { count: tags.length })}
            >
              {rows
                .filter((row) => !matches || matches.has(row.tag.id))
                .map(({ tag, depth }) => (
                  <li
                    key={tag.id}
                    className={`flex items-center gap-2 py-1.5 ${tag.id === selectedId ? "bg-accent/40" : ""}`}
                    style={{ paddingLeft: `${(matches ? 0 : depth) * 1.25 + 0.25}rem` }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setSelectedId(tag.id)}
                    >
                      <span
                        className={`truncate font-medium ${tag.hidden ? "line-through opacity-60" : ""}`}
                      >
                        {tag.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{tag.slug}</span>
                      {!tag.isSkill && (
                        <Badge variant="outline" className="text-[10px]">
                          {t("notSkill")}
                        </Badge>
                      )}
                      {tag.featured && tag.isSkill && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("featured")}
                        </Badge>
                      )}
                      {tag.hidden && (
                        <EyeOff
                          className="h-3 w-3 text-muted-foreground"
                          aria-label={t("hidden")}
                        />
                      )}
                    </button>
                    <span
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                      title={t("usageTitle")}
                    >
                      {tag.usage.projects}/{tag.usage.experiences}/{tag.usage.posts}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("moveUp", { name: tag.name })}
                      disabled={isPending}
                      onClick={() => run(() => reorderTag(tag.id, "up"))}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("moveDown", { name: tag.name })}
                      disabled={isPending}
                      onClick={() => run(() => reorderTag(tag.id, "down"))}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selected ? (
            <TagEditor
              key={`${selected.id}:${selected.slug}:${selected.aliases.join(",")}`}
              tag={selected}
              tags={tags}
              pending={isPending}
              run={run}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("selectHint")}</p>
          )}
        </div>
      </div>

      {creating && (
        <TagCreateDialog
          open
          onOpenChange={setCreating}
          initialName=""
          options={tags}
          onCreated={(tag) => {
            setSelectedId(tag.id);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface TagEditorProps {
  tag: AdminTag;
  tags: AdminTag[];
  pending: boolean;
  run: (action: () => Promise<ActionResult>, success?: string, after?: () => void) => void;
  onDeleted: () => void;
}

function TagEditor({ tag, tags, pending, run, onDeleted }: TagEditorProps) {
  const t = useTranslations("tags");
  const [form, setForm] = useState({
    name: tag.name,
    slug: tag.slug,
    nameTr: tag.nameTr ?? "",
    nameEn: tag.nameEn ?? "",
    kind: tag.kind,
    parentId: tag.parentId ?? "",
    isSkill: tag.isSkill,
    hidden: tag.hidden,
    featured: tag.featured,
    icon: tag.icon ?? "",
    descriptionTr: tag.descriptionTr ?? "",
    descriptionEn: tag.descriptionEn ?? "",
  });
  const [alias, setAlias] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [confirm, setConfirm] = useState<"merge" | "delete" | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const blocked = descendantIds(tags, tag.id);
  const mergeTarget = tags.find((x) => x.id === mergeInto);

  const save = () =>
    run(() => updateTag(tag.id, { ...form, parentId: form.parentId || null }), t("saved"));

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">{tagPath(tags, tag.id)}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("usage", { ...tag.usage })}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("name")} id="edit-name">
            <Input id="edit-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label={t("slug")} id="edit-slug">
            <Input id="edit-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label={t("nameTr")} id="edit-name-tr">
            <Input
              id="edit-name-tr"
              value={form.nameTr}
              onChange={(e) => set("nameTr", e.target.value)}
            />
          </Field>
          <Field label={t("nameEn")} id="edit-name-en">
            <Input
              id="edit-name-en"
              value={form.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
            />
          </Field>
          <Field label={t("kind")} id="edit-kind">
            <select
              id="edit-kind"
              className={selectClass}
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as TagKind)}
            >
              {TAG_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("parent")} id="edit-parent">
            <select
              id="edit-parent"
              className={selectClass}
              value={form.parentId}
              onChange={(e) => set("parentId", e.target.value)}
            >
              <ParentOptions options={tags} excludeIds={blocked} />
            </select>
          </Field>
          <Field label={t("icon")} id="edit-icon">
            <Input id="edit-icon" value={form.icon} onChange={(e) => set("icon", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="edit-is-skill"
              checked={form.isSkill}
              onCheckedChange={(v) => set("isSkill", v)}
            />
            <Label htmlFor="edit-is-skill">{t("isSkill")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="edit-hidden"
              checked={form.hidden}
              onCheckedChange={(v) => set("hidden", v)}
            />
            <Label htmlFor="edit-hidden">{t("hidden")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="edit-featured"
              checked={form.featured}
              disabled={!form.isSkill}
              onCheckedChange={(v) => set("featured", v)}
              aria-describedby="edit-featured-hint"
            />
            <Label htmlFor="edit-featured">{t("featured")}</Label>
          </div>
        </div>
        <p id="edit-featured-hint" className="text-xs text-muted-foreground">
          {t("featuredHint")}
        </p>
        <Field label={t("descriptionTr")} id="edit-desc-tr">
          <Textarea
            id="edit-desc-tr"
            value={form.descriptionTr}
            onChange={(e) => set("descriptionTr", e.target.value)}
          />
        </Field>
        <Field label={t("descriptionEn")} id="edit-desc-en">
          <Textarea
            id="edit-desc-en"
            value={form.descriptionEn}
            onChange={(e) => set("descriptionEn", e.target.value)}
          />
        </Field>
        <Button type="button" onClick={save} disabled={pending}>
          {t("save")}
        </Button>

        <section className="space-y-2 border-t border-border/40 pt-4">
          <h3 className="text-sm font-semibold">{t("aliases")}</h3>
          <ul className="flex flex-wrap gap-2">
            {tag.aliases.map((a) => (
              <li key={a}>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {a}
                  <button
                    type="button"
                    aria-label={t("removeAlias", { alias: a })}
                    onClick={() => run(() => removeTagAlias(a))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            ))}
            {tag.aliases.length === 0 && (
              <li className="text-xs text-muted-foreground">{t("noAliases")}</li>
            )}
          </ul>
          <div className="flex gap-2">
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={t("aliasPlaceholder")}
              aria-label={t("aliasPlaceholder")}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending || !alias.trim()}
              onClick={() =>
                run(
                  () => addTagAlias(tag.id, alias),
                  undefined,
                  () => setAlias(""),
                )
              }
            >
              {t("addAlias")}
            </Button>
          </div>
        </section>

        <section className="space-y-2 border-t border-border/40 pt-4">
          <h3 className="text-sm font-semibold">{t("merge")}</h3>
          <p className="text-xs text-muted-foreground">{t("mergeHint")}</p>
          <div className="flex gap-2">
            <select
              className={selectClass}
              value={mergeInto}
              onChange={(e) => setMergeInto(e.target.value)}
              aria-label={t("mergeTarget")}
            >
              <option value="">{t("mergeTarget")}</option>
              {tags
                .filter((x) => x.id !== tag.id)
                .map((x) => ({ id: x.id, label: tagPath(tags, x.id) }))
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !mergeInto}
              onClick={() => setConfirm("merge")}
            >
              {t("mergeButton")}
            </Button>
          </div>
        </section>

        <section className="space-y-2 border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="destructive"
            disabled={pending || total(tag) > 0 || tags.some((x) => x.parentId === tag.id)}
            onClick={() => setConfirm("delete")}
          >
            {t("delete")}
          </Button>
          {(total(tag) > 0 || tags.some((x) => x.parentId === tag.id)) && (
            <p className="text-xs text-muted-foreground">{t("deleteBlocked")}</p>
          )}
        </section>
      </CardContent>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "merge" ? t("mergeConfirmTitle") : t("deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "merge"
                ? t("mergeConfirm", { from: tag.name, into: mergeTarget?.name ?? "" })
                : t("deleteConfirm", { name: tag.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action === "merge")
                  run(() => mergeTag(tag.id, mergeInto), t("merged"), onDeleted);
                else run(() => deleteTag(tag.id), t("deleted"), onDeleted);
              }}
            >
              {confirm === "merge" ? t("mergeButton") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
