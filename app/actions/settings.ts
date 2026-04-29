"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

// Middleware to check admin rights inside server actions
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Bu işlemi yapmak için yetkiniz yok.");
  }
  return user;
}

/**
 * Get Site Settings
 * Accessible by anyone (public)
 */
export async function getSiteSettings() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "main" },
    });

    // If it doesn't exist, create default empty settings
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "main",
        },
      });
    }

    return settings;
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return null;
  }
}

/**
 * Update Site Settings
 * Admin only
 */
export async function updateSiteSettings(data: any) {
  try {
    await requireAdmin();

    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: data,
      create: {
        id: "main",
        ...data
      },
    });

    // Revalidate relevant paths
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/admin/settings");

    return { success: true, settings };
  } catch (error: any) {
    console.error("Error updating site settings:", error);
    return { error: error.message || "Ayarlar kaydedilemedi." };
  }
}
