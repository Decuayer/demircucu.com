"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SkillForestView } from "@/components/tags/skill-forest";
import { canonicalize } from "@/lib/tags/normalize";
import type { SkillForest, SkillNode } from "@/lib/tags/tree";

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
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        <div className="mb-12 text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-cyan-400"
          >
            <Code2 className="mr-1 h-3 w-3" />
            {t("title")}
          </Badge>
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">{t("description")}</p>
        </div>
        <div className="mx-auto mb-10 max-w-md">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
          />
        </div>
        <SkillForestView forest={shown} locale={locale} />
      </div>
    </div>
  );
}
