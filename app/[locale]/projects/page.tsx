import { getPublishedProjects } from "@/lib/data/projects";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredProjects from "./filtered";

export default async function Page() {
  const [projects, filterData] = await Promise.all([getPublishedProjects(), getTagFilterData()]);
  return <FilteredProjects projects={projects} filterData={filterData} />;
}
