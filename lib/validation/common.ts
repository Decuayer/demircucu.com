import { z } from "zod";
import { isMediaPath } from "@/lib/media/url";

/** Strips ASCII control characters (except tab/newline) that have no place in form input. */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (value: string) => value.replace(CONTROL_CHARS, "").trim();

export const text = (max: number) => z.string().transform(clean).pipe(z.string().max(max));

export const requiredText = (max: number) =>
  text(max).pipe(z.string().min(1, { error: "required" }));

/** Optional text: empty strings become null so the database never stores "". */
export const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ? clean(value) || null : null))
    .pipe(z.string().max(max).nullable())
    // Outermost .optional(): zod treats an object key as optional only if the outer schema is.
    .optional();

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "invalidEmail" }).max(254));

/** Absolute http(s) URL or empty (stored as null). */
export const optionalUrl = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .pipe(
    z
      .url({ protocol: /^https?$/, error: "invalidUrl" })
      .max(2048)
      .nullable(),
  )
  .optional();

/** Storage path inside the media bucket (see lib/media/url.ts). */
export const mediaPath = z.string().trim().refine(isMediaPath, { error: "invalidMediaPath" });

/** Optional storage path; empty becomes null. Existence is enforced by the foreign key. */
export const optionalMediaPath = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : null))
  .pipe(mediaPath.nullable())
  .optional();

/** Legacy slugs contain upper-case letters (normalised in Phase 4); accept them for edits. */
export const slug = z
  .string()
  .trim()
  .min(1, { error: "required" })
  .max(120)
  .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, { error: "invalidSlug" });

/** Prisma cuid / uuid style identifiers. */
export const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const sortOrder = z.coerce.number().int().min(-10_000).max(10_000);
