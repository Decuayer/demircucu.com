/**
 * Shared content types for admin forms and server actions.
 * Phase 2 replaces the input types with types inferred from zod schemas.
 */
import type { BlogPost, Experience, Project, Tag } from "@prisma/client";

export interface FileAttachment {
  name: string;
  url: string;
}

export interface TagInput {
  nameTr: string;
  nameEn: string;
  slug: string;
}

interface ContentRelationsInput {
  tagsList?: TagInput[];
  filesList?: FileAttachment[];
}

export interface ProjectInput extends ContentRelationsInput {
  titleTr: string;
  titleEn: string;
  slug: string;
  summaryTr?: string;
  summaryEn?: string;
  descriptionTr?: string | null;
  descriptionEn?: string | null;
  logo?: string | null;
  githubUrl?: string | null;
  liveUrl?: string | null;
  order?: number;
  published?: boolean;
  featured?: boolean;
}

export interface ExperienceInput extends ContentRelationsInput {
  company: string;
  positionTr: string;
  positionEn: string;
  descriptionTr: string;
  descriptionEn: string;
  detailsTr?: string | null;
  detailsEn?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  logo?: string | null;
  order?: number;
  published?: boolean;
}

export interface BlogPostInput extends ContentRelationsInput {
  titleTr: string;
  titleEn: string;
  slug: string;
  excerptTr: string;
  excerptEn: string;
  contentTr: string;
  contentEn: string;
  coverImage?: string | null;
  published?: boolean;
  featured?: boolean;
}

export type ProjectWithTags = Project & { tags: Tag[] };
export type ExperienceWithTags = Experience & { tags: Tag[] };
export type BlogPostWithTags = BlogPost & { tags: Tag[] };

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

/** Parses an untyped Prisma JSON column holding file attachments. */
export function toFileAttachments(value: unknown): FileAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is FileAttachment =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === "string" &&
      typeof (item as Record<string, unknown>).url === "string",
  );
}
