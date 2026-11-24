/**
 * Rate limit policies. Fixed windows; every bucket key is hashed before it is stored.
 * Limits are per identifier (IP address, user id or e-mail address, see the callers).
 */
export interface RateLimitPolicy {
  /** Stable bucket name; part of the stored key. */
  name: string;
  limit: number;
  windowSeconds: number;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RATE_LIMITS = {
  loginPerIp: { name: "login-ip", limit: 20, windowSeconds: 15 * MINUTE },
  // Per account and IP: stops guessing from one source without letting others lock the account.
  loginPerAccountIp: { name: "login-account-ip", limit: 5, windowSeconds: 15 * MINUTE },
  // Per account across all IPs: a high ceiling against distributed guessing only.
  loginPerAccount: { name: "login-account", limit: 50, windowSeconds: 15 * MINUTE },
  registerPerIp: { name: "register-ip", limit: 3, windowSeconds: HOUR },
  passwordResetPerIp: { name: "reset-ip", limit: 5, windowSeconds: HOUR },
  passwordResetPerAccount: { name: "reset-account", limit: 3, windowSeconds: HOUR },
  contactPerIp: { name: "contact-ip", limit: 3, windowSeconds: 10 * MINUTE },
  contactPerIpDaily: { name: "contact-ip-day", limit: 10, windowSeconds: DAY },
  commentPerUser: { name: "comment-user", limit: 5, windowSeconds: MINUTE },
  commentPerUserDaily: { name: "comment-user-day", limit: 50, windowSeconds: DAY },
  likePerUser: { name: "like-user", limit: 30, windowSeconds: MINUTE },
} as const satisfies Record<string, RateLimitPolicy>;

/** Rows older than this are removed opportunistically; longer than the longest window. */
export const RATE_LIMIT_RETENTION_SECONDS = DAY + HOUR;
