"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTag } from "@/app/actions/tags";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { TAG_KINDS } from "@/lib/tags/kinds";
import { tagPath, type TagOption } from "@/lib/tags/options";
import type { TagKind } from "@prisma/client";

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Parent choices: every tag except `excludeIds`, labelled with its path, sorted by path. */
export function ParentOptions({
  options,
  excludeIds = [],
}: {
  options: readonly TagOption[];
  excludeIds?: readonly string[];
}) {
  const t = useTranslations("tags");
  const items = options
    .filter((o) => !excludeIds.includes(o.id))
    .map((o) => ({ id: o.id, label: tagPath(options, o.id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <>
      <option value="">{t("noParent")}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </>
  );
}

interface TagCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  options: readonly TagOption[];
  onCreated: (tag: TagOption, existing: boolean) => void;
}

export function TagCreateDialog({
  open,
  onOpenChange,
  initialName,
  options,
  onCreated,
}: TagCreateDialogProps) {
  const t = useTranslations("tags");
  const errorMessage = useActionErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [nameTr, setNameTr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [kind, setKind] = useState<TagKind>("TOPIC");
  const [parentId, setParentId] = useState("");
  const [isSkill, setIsSkill] = useState(true);

  const submit = () => {
    startTransition(async () => {
      const res = await createTag({
        name,
        nameTr,
        nameEn,
        kind,
        parentId: parentId || null,
        isSkill,
      });
      if (res.error) {
        toast.error(errorMessage(res.error));
        return;
      }
      if (res.existing) toast.info(t("alreadyExists", { name: res.tag.name }));
      onCreated(res.tag, res.existing);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="tag-name">{t("name")}</Label>
            <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tag-name-tr">{t("nameTr")}</Label>
              <Input id="tag-name-tr" value={nameTr} onChange={(e) => setNameTr(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tag-name-en">{t("nameEn")}</Label>
              <Input id="tag-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tag-kind">{t("kind")}</Label>
              <select
                id="tag-kind"
                className={selectClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as TagKind)}
              >
                {TAG_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`kinds.${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tag-parent">{t("parent")}</Label>
              <select
                id="tag-parent"
                className={selectClass}
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <ParentOptions options={options} />
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="tag-is-skill" checked={isSkill} onCheckedChange={setIsSkill} />
            <Label htmlFor="tag-is-skill">{t("isSkill")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !name.trim()}>
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
