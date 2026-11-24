"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validation/content";
import { mediaPathsInHtml } from "@/lib/media/url";
import { syncMediaUsage } from "@/lib/media/usage";

/** Admin only. Unknown keys are rejected (`.strict()`), so no other column can be written. */
export async function updateSiteSettings(input: SiteSettingsInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { skills, hobbies, ...fields } = siteSettingsSchema.parse(input);
    const data = {
      ...fields,
      ...(skills ? { skills: skills as Prisma.InputJsonValue } : {}),
      ...(hobbies ? { hobbies: hobbies as Prisma.InputJsonValue } : {}),
    };
    await prisma.$transaction(async (tx) => {
      const saved = await tx.siteSettings.upsert({
        where: { id: "main" },
        update: data,
        create: { id: "main", ...data },
        select: { aboutBioTr: true, aboutBioEn: true },
      });
      await syncMediaUsage(tx, "SITE_SETTINGS", "main", {
        optional: {
          aboutBio: [...mediaPathsInHtml(saved.aboutBioTr), ...mediaPathsInHtml(saved.aboutBioEn)],
        },
      });
    });
    invalidate({ entity: "settings" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateSiteSettings");
  }
}
