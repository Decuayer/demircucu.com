import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";
import type { DeviceType } from "@prisma/client";

/**
 * Request parsing for page view tracking. Pure functions over header values so they can be
 * tested without a request.
 */

export interface ClientInfo {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
}

const MAX_LABEL = 40;

function label(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_LABEL) : null;
}

export function parseUserAgent(userAgent: string): ClientInfo {
  const result = new UAParser(userAgent).getResult();
  const type = result.device.type;
  let deviceType: DeviceType;
  if (type === "mobile") deviceType = "MOBILE";
  else if (type === "tablet") deviceType = "TABLET";
  else if (type === undefined) deviceType = result.os.name ? "DESKTOP" : "OTHER";
  else deviceType = "OTHER";
  return { deviceType, browser: label(result.browser.name), os: label(result.os.name) };
}

export function isBotUserAgent(userAgent: string | null): boolean {
  return !userAgent || isbot(userAgent);
}

/** Do Not Track or Global Privacy Control: the visitor is not recorded at all. */
export function hasPrivacySignal(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

/** Router prefetches and speculative loads are not views. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`;
  return headers.has("next-router-prefetch") || /prefetch|prerender/i.test(purpose.toLowerCase());
}

/** ISO 3166-1 alpha-2 country from Vercel's geo header; null elsewhere or for "XX"-style junk. */
export function countryFrom(headers: Headers): string | null {
  const value = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) && value !== "XX" ? value : null;
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Host of an external referrer, without "www.". Internal navigation (same site, including the
 * apex/www variants) and anything that is not an http(s) URL give null.
 */
export function referrerHost(referrer: string | null | undefined, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = bareHost(url.hostname);
    if (!host || host === bareHost(ownHost.split(":")[0]!)) return null;
    return host.slice(0, 253);
  } catch {
    return null;
  }
}

/** Hostname of an outbound link, without "www."; null for non-http(s) links. */
export function linkHost(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return bareHost(url.hostname).slice(0, 253) || null;
  } catch {
    return null;
  }
}
