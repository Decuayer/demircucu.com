"use client";

import { useLocale } from "next-intl";
import { TagFilterBar, useTagFilter } from "@/components/tags/tag-filter";
import type { TagFilterData } from "@/lib/data/skills";
import BlogClient, { type BlogClientProps } from "./client";

/** `?tag=<slug>` filter over the list (see useTagFilter). */
export default function FilteredBlog({
  posts,
  filterData,
}: {
  posts: BlogClientProps["posts"];
  filterData: TagFilterData;
}) {
  const locale = useLocale();
  const { items, active, reader } = useTagFilter(posts, "tag", filterData, locale);
  return (
    <>
      {reader}
      <BlogClient
        posts={[...items]}
        filter={<TagFilterBar active={active} count={items.length} />}
      />
    </>
  );
}
