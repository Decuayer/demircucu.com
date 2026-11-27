import { getHomeExperiences, getHomePosts, getHomeProjects, getHomeSkills } from "@/lib/data/home";
import { getSiteSettings } from "@/lib/data/settings";
import HomeClient from "./client";

export default async function HomePage() {
  const [settings, projects, experiences, skills, posts] = await Promise.all([
    getSiteSettings(),
    getHomeProjects(),
    getHomeExperiences(),
    getHomeSkills(),
    getHomePosts(),
  ]);
  return (
    <HomeClient
      settings={settings}
      projects={projects}
      experiences={experiences}
      skills={skills.skills}
      posts={posts}
    />
  );
}
