import { z } from "zod";
import { canonicalize } from "@/lib/tags/normalize";
import { TAG_KINDS } from "@/lib/tags/kinds";
import { id, optionalText, requiredText, sortOrder } from "./common";

/** Any spelling; stored in canonical form ("Node.js" -> "nodejs"). */
const canonicalKey = z
  .string()
  .max(80)
  .transform((value, ctx) => {
    const key = canonicalize(value);
    if (!key) {
      ctx.addIssue({ code: "custom", message: "invalidSlug" });
      return z.NEVER;
    }
    return key;
  });

const kind = z.enum(TAG_KINDS);
const iconSlug = z
  .string()
  .trim()
  .max(60)
  .regex(/^[a-z0-9]*$/, { error: "invalidSlug" })
  .transform((value) => value || null)
  .nullish();

export const createTagSchema = z
  .object({
    name: requiredText(80),
    /** Defaults to the canonical form of the name. */
    slug: canonicalKey.optional(),
    nameTr: optionalText(80),
    nameEn: optionalText(80),
    kind: kind.default("TOPIC"),
    parentId: id.nullish(),
    isSkill: z.boolean().default(true),
  })
  .strict();

export const updateTagSchema = z
  .object({
    name: requiredText(80),
    slug: canonicalKey,
    nameTr: optionalText(80),
    nameEn: optionalText(80),
    kind,
    parentId: id.nullable(),
    isSkill: z.boolean(),
    hidden: z.boolean(),
    icon: iconSlug,
    descriptionTr: optionalText(2000),
    descriptionEn: optionalText(2000),
    order: sortOrder,
  })
  .partial()
  .strict();

export const aliasSchema = canonicalKey;

export type CreateTagInput = z.input<typeof createTagSchema>;
export type UpdateTagInput = z.input<typeof updateTagSchema>;
