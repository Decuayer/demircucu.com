import { z } from "zod";
import { OUTBOUND_TARGETS } from "./constants";

export { OUTBOUND_TARGETS };

/** Body of `POST /api/track`. The client generates the page view id so beacons can refer to it. */

const id = z.uuid();
const path = z.string().min(1).max(512).startsWith("/");
const utm = z.string().trim().max(100).optional();

export const viewPayload = z.object({
  type: z.literal("view"),
  id,
  path,
  referrer: z.string().max(2048).optional(),
  utmSource: utm,
  utmMedium: utm,
  utmCampaign: utm,
});

/** Six hours: anything longer is a tab left open, not reading. */
export const MAX_DURATION_MS = 6 * 60 * 60 * 1000;

export const engagementPayload = z.object({
  type: z.literal("engagement"),
  id,
  durationMs: z.number().int().min(0).max(MAX_DURATION_MS),
  scrollDepth: z.number().int().min(0).max(100),
});

export const outboundPayload = z.object({
  type: z.literal("outbound"),
  /** The page view the click happened on. */
  id,
  path,
  href: z.string().min(1).max(2048),
  target: z.enum(OUTBOUND_TARGETS).optional(),
});

export const trackPayload = z.discriminatedUnion("type", [
  viewPayload,
  engagementPayload,
  outboundPayload,
]);

export type TrackPayload = z.infer<typeof trackPayload>;
export type ViewPayload = z.infer<typeof viewPayload>;
export type EngagementPayload = z.infer<typeof engagementPayload>;
export type OutboundPayload = z.infer<typeof outboundPayload>;

/** Bodies are tiny; anything bigger is not from our tracker. */
export const MAX_BODY_BYTES = 4096;
