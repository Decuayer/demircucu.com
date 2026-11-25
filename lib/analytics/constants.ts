/** Shared by the client tracker and the server; no dependencies so the tracker stays small. */
export const OUTBOUND_TARGETS = ["GITHUB", "LIVE", "DOCUMENT", "OTHER"] as const;
export type OutboundTargetName = (typeof OUTBOUND_TARGETS)[number];
