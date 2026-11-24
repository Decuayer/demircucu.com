import { getPublishedExperiences } from "@/lib/data/experiences";
import { getTagFilterData } from "@/lib/data/skills";
import FilteredExperience from "./filtered";

export default async function Page() {
  const [experiences, filterData] = await Promise.all([
    getPublishedExperiences(),
    getTagFilterData(),
  ]);
  return <FilteredExperience experiences={experiences} filterData={filterData} />;
}
