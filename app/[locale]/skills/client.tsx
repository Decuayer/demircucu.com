"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Code2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SkillForestView } from "@/components/tags/skill-forest";
import { canonicalize } from "@/lib/tags/normalize";
import type { SkillForest, SkillNode } from "@/lib/tags/tree";
import { PageHeader, PageShell } from "@/components/layout/page-header";

/** Keeps nodes whose name or slug matches the query, and the ancestors of those nodes. */
function filterForest(forest: SkillForest, query: string): SkillForest {
  const q = canonicalize(query);
  if (!q) return forest;
  const keep = (node: SkillNode): SkillNode | null => {
    const children = node.children.map(keep).filter((n): n is SkillNode => n !== null);
    const hit = [node.slug, node.name, node.nameTr, node.nameEn].some((v) =>
      v ? (canonicalize(v) ?? "").includes(q) : false,
    );
    return hit || children.length > 0
      ? { ...node, children: hit ? node.children : children }
      : null;
  };
  const prune = (nodes: SkillNode[]) => nodes.map(keep).filter((n): n is SkillNode => n !== null);
  return { categories: prune(forest.categories), uncategorized: prune(forest.uncategorized) };
}

export default function SkillsClient({ forest }: { forest: SkillForest }) {
  const t = useTranslations("skills");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterForest(forest, query), [forest, query]);

  return (
    <PageShell>
      <PageHeader eyebrow={t("title")} icon={Code2} title={t("title")} lead={t("description")} />
      <div className="mx-auto mb-8 max-w-md">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
        />
      </div>
      <SkillForestView forest={shown} locale={locale} />
    </PageShell>
  );
}
