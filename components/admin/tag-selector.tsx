"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Lock, Plus, X } from "lucide-react";
import type { TagSource } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { hasExactTag, searchTagOptions, tagPath, type TagOption } from "@/lib/tags/options";
import { TagCreateDialog } from "./tag-create-dialog";

/** A tag on the content row being edited. */
export interface SelectedTag {
  id: string;
  source: TagSource;
  /** Hidden on this row (only offered for tags the sync attached). */
  linkHidden: boolean;
}

interface TagSelectorProps {
  options: TagOption[];
  onOptionsChange: (options: TagOption[]) => void;
  value: SelectedTag[];
  onChange: (value: SelectedTag[]) => void;
}

/** Form payload for the content actions. */
export function toTagPayload(value: readonly SelectedTag[]) {
  return {
    tagIds: value.filter((t) => t.source === "MANUAL").map((t) => t.id),
    hiddenTagIds: value.filter((t) => t.linkHidden).map((t) => t.id),
  };
}

/**
 * Tag picker for projects, experiences and posts: searches existing tags by name, slug and
 * alias (any spelling), offers to create a missing one, and shows GitHub / language tags as
 * locked (they can only be hidden on this row).
 */
export function TagSelector({ options, onOptionsChange, value, onChange }: TagSelectorProps) {
  const t = useTranslations("tags");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const selectedIds = new Set(value.map((v) => v.id));
  const results = query.trim()
    ? searchTagOptions(options, query, 12).filter((o) => !selectedIds.has(o.id))
    : [];
  const offerCreate = query.trim() !== "" && !hasExactTag(options, query);

  const add = (id: string) => {
    if (!selectedIds.has(id)) onChange([...value, { id, source: "MANUAL", linkHidden: false }]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2" aria-label={t("selected")}>
        {value.map((item) => {
          const tag = byId.get(item.id);
          const locked = item.source !== "MANUAL";
          return (
            <li key={item.id}>
              <Badge
                variant="secondary"
                className={`flex items-center gap-1 px-2 py-1 ${item.linkHidden ? "opacity-50" : ""}`}
                title={tag ? tagPath(options, tag.id) : undefined}
              >
                {locked && <Lock className="h-3 w-3" aria-label={t(`source.${item.source}`)} />}
                {tag?.name ?? item.id}
                {locked ? (
                  <button
                    type="button"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={item.linkHidden ? t("showHere") : t("hideHere")}
                    onClick={() =>
                      onChange(
                        value.map((v) =>
                          v.id === item.id ? { ...v, linkHidden: !v.linkHidden } : v,
                        ),
                      )
                    }
                  >
                    {item.linkHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={t("remove", { name: tag?.name ?? "" })}
                    onClick={() => onChange(value.filter((v) => v.id !== item.id))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            </li>
          );
        })}
      </ul>

      <Command shouldFilter={false} className="rounded-lg border border-border/50 bg-accent/30">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        {/* Always rendered: the input's aria-controls points at the list. */}
        <CommandList hidden={results.length === 0 && !offerCreate}>
          {(results.length > 0 || offerCreate) && (
            <CommandGroup>
              {results.map((option) => (
                <CommandItem key={option.id} value={option.id} onSelect={() => add(option.id)}>
                  <span>{option.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {tagPath(options, option.id)}
                  </span>
                </CommandItem>
              ))}
              {offerCreate && (
                <CommandItem value="__create__" onSelect={() => setCreating(query.trim())}>
                  <Plus className="h-4 w-4" />
                  {t("createNamed", { name: query.trim() })}
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </Command>

      {creating !== null && (
        <TagCreateDialog
          open
          onOpenChange={(open) => !open && setCreating(null)}
          initialName={creating}
          options={options}
          onCreated={(tag) => {
            if (!byId.has(tag.id)) onOptionsChange([...options, tag]);
            add(tag.id);
          }}
        />
      )}
    </div>
  );
}
