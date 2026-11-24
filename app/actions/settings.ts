"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validation/content";

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
    await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: data,
      create: { id: "main", ...data },
    });
    invalidate({ entity: "settings" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateSiteSettings");
  }
}
