import type { TagKind } from "@prisma/client";

/** TagKind values in display order; importable from client components (no Prisma runtime). */
export const TAG_KINDS = [
  "LANGUAGE",
  "FRAMEWORK",
  "LIBRARY",
  "DATABASE",
  "TOOL",
  "PLATFORM",
  "CLOUD",
  "CONCEPT",
  "DOMAIN",
  "TOPIC",
] as const satisfies readonly TagKind[];

// Fails to compile if the Prisma enum gains a value that is missing here.
type Missing = Exclude<TagKind, (typeof TAG_KINDS)[number]>;
const exhaustive: Missing extends never ? true : never = true;
void exhaustive;
