"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { TagFilterBar, useTagFilter } from "@/components/tags/tag-filter";
import type { TagFilterData } from "@/lib/data/skills";
import { getTranslated } from "@/lib/i18n-utils";
import {
  filterProjects,
  PROJECT_SORTS,
  type ProjectQuery,
  type ProjectSort,
} from "@/lib/projects/list";
import ProjectsClient, { type ProjectsClientProps } from "./client";

function QueryReader({ onChange }: { onChange: (query: ProjectQuery) => void }) {
  const params = useSearchParams();
  const lang = params.get("lang");
  const q = params.get("q");
  const sort = params.get("sort");
  useEffect(() => {
    onChange({
      lang,
      q: q ?? "",
      sort: PROJECT_SORTS.includes(sort as ProjectSort) ? (sort as ProjectSort) : "featured",
    });
  }, [lang, q, sort, onChange]);
  return null;
}

/**
 * Filters over the list, all shareable through the URL: `?skill=<tag>` (tag subtree),
 * `?lang=<language>`, `?q=<text>`, `?sort=featured|updated|stars`. The prerendered HTML holds
 * every project; filters apply once the browser has read the URL.
 */
export default function FilteredProjects({
  projects,
  filterData,
}: {
  projects: ProjectsClientProps["projects"];
  filterData: TagFilterData;
}) {
  const locale = useLocale();
  const t = useTranslations("projects.filters");
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState<ProjectQuery>({ lang: null, q: "", sort: "featured" });
  const { items, active, reader } = useTagFilter(projects, "skill", filterData, locale);

  const languages = useMemo(
    () =>
      [
        ...new Set(projects.map((p) => p.primaryLanguage).filter((l): l is string => Boolean(l))),
      ].sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const visible = filterProjects(
    items,
    query,
    (p) => `${getTranslated(p, "title", locale)} ${getTranslated(p, "summary", locale)}`,
  );

  const update = (patch: Partial<ProjectQuery>) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const set = (key: string, value: string | null | undefined, fallback = "") =>
      value && value !== fallback ? params.set(key, value) : params.delete(key);
    set("lang", next.lang);
    set("q", next.q.trim());
    set("sort", next.sort, "featured");
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  const controls = (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          // Re-mounted when the URL query changes (back / forward), so it shows the active term.
          key={query.q}
          type="search"
          defaultValue={query.q}
          onKeyDown={(e) => e.key === "Enter" && update({ q: e.currentTarget.value })}
          onBlur={(e) => e.currentTarget.value !== query.q && update({ q: e.currentTarget.value })}
          placeholder={t("search")}
          aria-label={t("search")}
          className="pl-9"
        />
      </div>
      <select
        value={query.lang ?? ""}
        onChange={(e) => update({ lang: e.target.value || null })}
        aria-label={t("language")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{t("allLanguages")}</option>
        {languages.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={query.sort}
        onChange={(e) => update({ sort: e.target.value as ProjectSort })}
        aria-label={t("sort")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {PROJECT_SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`sorts.${s}`)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      {reader}
      <Suspense fallback={null}>
        <QueryReader onChange={setQuery} />
      </Suspense>
      <ProjectsClient
        projects={[...visible]}
        filter={
          <>
            <TagFilterBar active={active} count={visible.length} />
            {controls}
            {visible.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>
            )}
          </>
        }
      />
    </>
  );
}
