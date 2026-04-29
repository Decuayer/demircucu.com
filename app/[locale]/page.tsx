import { getFeaturedProjects } from "@/app/actions/projects";
import { getFeaturedBlogPosts } from "@/app/actions/blog";
import { getSiteSettings } from "@/app/actions/settings";
import HomeClient from "./client";

// Revalidate the page every 1 hour, or it can be dynamic depending on needs
export const revalidate = 3600;

export default async function HomePage() {
  const [featuredProjects, latestPosts, settings] = await Promise.all([
    getFeaturedProjects(),
    getFeaturedBlogPosts(3),
    getSiteSettings()
  ]);

  return <HomeClient featuredProjects={featuredProjects} latestPosts={latestPosts} settings={settings} />;
}
