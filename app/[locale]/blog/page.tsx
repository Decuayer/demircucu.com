import { getPublishedPosts } from "@/lib/data/posts";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredBlog from "./filtered";

export default async function Page() {
  const [posts, filterData] = await Promise.all([getPublishedPosts(), getTagFilterData()]);
  return <FilteredBlog posts={posts} filterData={filterData} />;
}
