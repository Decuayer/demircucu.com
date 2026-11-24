/**
 * Shared content types for pages and admin forms. Input types come from the zod schemas
 * (lib/validation/content.ts); row shapes come from the data layer.
 */
import type {
  adminGetExperience,
  adminGetPost,
  adminGetProject,
  adminGetSiteSettings,
} from "@/lib/data/admin";

export type { PublicExperience, PublicPost, PublicProject } from "@/lib/data/present";
export type { PublicSiteSettings } from "@/lib/data/settings";
export type { Attachment } from "@/lib/media/attachments";

export type AdminProject = NonNullable<Awaited<ReturnType<typeof adminGetProject>>>;
export type AdminExperience = NonNullable<Awaited<ReturnType<typeof adminGetExperience>>>;
export type AdminPost = NonNullable<Awaited<ReturnType<typeof adminGetPost>>>;
export type AdminSiteSettings = NonNullable<Awaited<ReturnType<typeof adminGetSiteSettings>>>;

/** Shape of SiteSettings.skills entries (removed in Phase 4 in favour of tags). */
export interface SkillSetting {
  nameTr: string;
  nameEn: string;
  level: number;
}

/** Shape of SiteSettings.hobbies entries. */
export interface HobbySetting {
  nameTr: string;
  nameEn: string;
  descTr?: string;
  descEn?: string;
  icon?: string;
}
