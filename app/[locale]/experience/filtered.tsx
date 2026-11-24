"use client";

import { useLocale } from "next-intl";
import { TagFilterBar, useTagFilter } from "@/components/tags/tag-filter";
import type { TagFilterData } from "@/lib/data/skills";
import ExperienceClient, { type ExperienceClientProps } from "./client";

/** `?skill=<slug>` filter over the list (see useTagFilter). */
export default function FilteredExperience({
  experiences,
  filterData,
}: {
  experiences: ExperienceClientProps["experiences"];
  filterData: TagFilterData;
}) {
  const locale = useLocale();
  const { items, active, reader } = useTagFilter(experiences, "skill", filterData, locale);
  return (
    <>
      {reader}
      <ExperienceClient
        experiences={[...items]}
        filter={<TagFilterBar active={active} count={items.length} />}
      />
    </>
  );
}
