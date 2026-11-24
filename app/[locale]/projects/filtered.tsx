"use client";

import { useLocale } from "next-intl";
import { TagFilterBar, useTagFilter } from "@/components/tags/tag-filter";
import type { TagFilterData } from "@/lib/data/skills";
import ProjectsClient, { type ProjectsClientProps } from "./client";

/** `?skill=<slug>` filter over the list (see useTagFilter). */
export default function FilteredProjects({
  projects,
  filterData,
}: {
  projects: ProjectsClientProps["projects"];
  filterData: TagFilterData;
}) {
  const locale = useLocale();
  const { items, active, reader } = useTagFilter(projects, "skill", filterData, locale);
  return (
    <>
      {reader}
      <ProjectsClient
        projects={[...items]}
        filter={<TagFilterBar active={active} count={items.length} />}
      />
    </>
  );
}
