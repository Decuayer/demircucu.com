import { z } from "zod";
import { sanitizeHtml, sanitizeOptionalHtml } from "@/lib/sanitize/html";
import {
  id,
  mediaPath,
  optionalMediaPath,
  optionalText,
  optionalUrl,
  requiredText,
  slug,
  sortOrder,
  text,
} from "./common";

const richText = (max: number) => z.string().max(max).transform(sanitizeHtml);
const optionalRichText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((value) => (value ? sanitizeOptionalHtml(value) : null));

const RICH_TEXT_MAX = 200_000;

/**
 * Tags of a content row: the MANUAL tags (`tagIds`, exactly this set afterwards) and the
 * attached tags hidden on this row (`hiddenTagIds`, typically GitHub / language tags, which
 * cannot be removed by hand). Unknown ids fail on the foreign key.
 */
const tagIds = z.array(id).max(50);

/** An uploaded file of the media library (`path`) or an external https link (`url`). */
export const fileAttachmentSchema = z.union([
  z.object({ name: requiredText(200), path: mediaPath }).strict(),
  z.object({ name: requiredText(200), url: z.url({ protocol: /^https$/ }).max(2048) }).strict(),
]);

const relations = {
  tagIds: tagIds.optional(),
  hiddenTagIds: tagIds.optional(),
  filesList: z.array(fileAttachmentSchema).max(20).optional(),
};

export const projectSchema = z.object({
  titleTr: requiredText(200),
  titleEn: requiredText(200),
  slug,
  summaryTr: requiredText(500),
  summaryEn: requiredText(500),
  descriptionTr: optionalRichText(RICH_TEXT_MAX),
  descriptionEn: optionalRichText(RICH_TEXT_MAX),
  logoPath: optionalMediaPath,
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  order: sortOrder.default(0),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  ...relations,
});

export const experienceSchema = z
  .object({
    company: requiredText(200),
    positionTr: requiredText(200),
    positionEn: requiredText(200),
    descriptionTr: requiredText(2000),
    descriptionEn: requiredText(2000),
    detailsTr: optionalRichText(RICH_TEXT_MAX),
    detailsEn: optionalRichText(RICH_TEXT_MAX),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullish(),
    logoPath: optionalMediaPath,
    order: sortOrder.default(0),
    published: z.boolean().default(true),
    ...relations,
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    path: ["endDate"],
    error: "endBeforeStart",
  });

export const blogPostSchema = z.object({
  titleTr: requiredText(200),
  titleEn: requiredText(200),
  slug,
  excerptTr: requiredText(1000),
  excerptEn: requiredText(1000),
  contentTr: richText(RICH_TEXT_MAX),
  contentEn: richText(RICH_TEXT_MAX),
  coverPath: optionalMediaPath,
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  ...relations,
});

export const skillSettingSchema = z.object({
  nameTr: text(80),
  nameEn: text(80),
  level: z.coerce.number().int().min(0).max(100),
});

export const hobbySettingSchema = z.object({
  nameTr: text(80),
  nameEn: text(80),
  descTr: text(500).optional(),
  descEn: text(500).optional(),
  icon: text(50).optional(),
});

const short = optionalText(300);
const long = optionalText(5000);

/** Allowlist of editable site settings (S5: no mass assignment of arbitrary columns). */
export const siteSettingsSchema = z
  .object({
    heroTitleTr: short,
    heroTitleEn: short,
    heroSubTr: short,
    heroSubEn: short,
    aboutBioTr: optionalRichText(RICH_TEXT_MAX),
    aboutBioEn: optionalRichText(RICH_TEXT_MAX),
    aboutPhotoPath: optionalMediaPath,
    aboutLocationTr: short,
    aboutLocationEn: short,
    aboutExperienceTr: short,
    aboutExperienceEn: short,
    skills: z.array(skillSettingSchema).max(100),
    hobbies: z.array(hobbySettingSchema).max(50),
    contactEmail: z
      .union([z.literal(""), z.email().max(254)])
      .nullish()
      .transform((value) => (value ? value : null)),
    contactPhone: optionalText(50),
    contactAddress: short,
    socialGithub: optionalUrl,
    socialLinkedin: optionalUrl,
    socialTwitter: optionalUrl,
    socialInstagram: optionalUrl,
    socialYoutube: optionalUrl,
    socialMedium: optionalUrl,
    socialStackoverflow: optionalUrl,
    ctaTitleTr: short,
    ctaTitleEn: short,
    ctaDescriptionTr: long,
    ctaDescriptionEn: long,
    footerTitleTr: short,
    footerTitleEn: short,
    footerDescriptionTr: long,
    footerDescriptionEn: long,
    siteTitleTr: short,
    siteTitleEn: short,
    siteDescriptionTr: long,
    siteDescriptionEn: long,
    faviconPath: optionalMediaPath,
  })
  .partial()
  .strict();

export type ProjectInput = z.input<typeof projectSchema>;
export type ExperienceInput = z.input<typeof experienceSchema>;
export type BlogPostInput = z.input<typeof blogPostSchema>;
export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
