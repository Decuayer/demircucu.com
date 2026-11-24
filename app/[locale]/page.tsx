import { getFeaturedProjects } from "@/lib/data/projects";
import { getFeaturedPosts } from "@/lib/data/posts";
import { getSiteSettings } from "@/lib/data/settings";
import HomeClient from "./client";

export default async function HomePage() {
  const [featuredProjects, latestPosts, settings] = await Promise.all([
    getFeaturedProjects(),
    getFeaturedPosts(3),
    getSiteSettings(),
  ]);

  return (
    <HomeClient featuredProjects={featuredProjects} latestPosts={latestPosts} settings={settings} />
  );
}
