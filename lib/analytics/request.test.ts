import { describe, expect, it } from "vitest";
import {
  countryFrom,
  hasPrivacySignal,
  isBotUserAgent,
  isPrefetch,
  linkHost,
  parseUserAgent,
  referrerHost,
} from "./request";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HEADLESS =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";

describe("parseUserAgent", () => {
  it("detects desktop, mobile and tablet", () => {
    expect(parseUserAgent(CHROME_MAC)).toEqual({
      deviceType: "DESKTOP",
      browser: "Chrome",
      os: "Mac OS",
    });
    expect(parseUserAgent(SAFARI_IPHONE)).toMatchObject({ deviceType: "MOBILE", os: "iOS" });
    expect(parseUserAgent(IPAD).deviceType).toBe("TABLET");
  });

  it("falls back to OTHER without an OS", () => {
    expect(parseUserAgent("curl/8.0").deviceType).toBe("OTHER");
  });
});

describe("isBotUserAgent", () => {
  it("flags crawlers, headless browsers and missing user agents", () => {
    expect(isBotUserAgent(GOOGLEBOT)).toBe(true);
    expect(isBotUserAgent(HEADLESS)).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent(CHROME_MAC)).toBe(false);
  });
});

describe("hasPrivacySignal", () => {
  it("honours DNT and GPC", () => {
    expect(hasPrivacySignal(new Headers({ dnt: "1" }))).toBe(true);
    expect(hasPrivacySignal(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(hasPrivacySignal(new Headers({ dnt: "0" }))).toBe(false);
    expect(hasPrivacySignal(new Headers())).toBe(false);
  });
});

describe("isPrefetch", () => {
  it("detects router and speculative prefetches", () => {
    expect(isPrefetch(new Headers({ "next-router-prefetch": "1" }))).toBe(true);
    expect(isPrefetch(new Headers({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetch(new Headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetch(new Headers())).toBe(false);
  });
});

describe("countryFrom", () => {
  it("accepts two-letter codes only", () => {
    expect(countryFrom(new Headers({ "x-vercel-ip-country": "tr" }))).toBe("TR");
    expect(countryFrom(new Headers({ "x-vercel-ip-country": "XX" }))).toBeNull();
    expect(countryFrom(new Headers({ "x-vercel-ip-country": "TUR" }))).toBeNull();
    expect(countryFrom(new Headers())).toBeNull();
  });
});

describe("referrerHost", () => {
  it("keeps external hosts without www", () => {
    expect(referrerHost("https://www.google.com/search?q=x", "www.demircucu.com")).toBe(
      "google.com",
    );
    expect(referrerHost("https://news.ycombinator.com/item?id=1", "demircucu.com")).toBe(
      "news.ycombinator.com",
    );
  });

  it("drops internal, non-http and malformed referrers", () => {
    expect(referrerHost("https://demircucu.com/tr", "www.demircucu.com")).toBeNull();
    expect(referrerHost("https://www.demircucu.com/tr", "demircucu.com")).toBeNull();
    expect(referrerHost("http://localhost:3000/tr", "localhost:3000")).toBeNull();
    expect(referrerHost("android-app://com.google", "demircucu.com")).toBeNull();
    expect(referrerHost("not a url", "demircucu.com")).toBeNull();
    expect(referrerHost(undefined, "demircucu.com")).toBeNull();
  });
});

describe("linkHost", () => {
  it("returns the bare host of http(s) links", () => {
    expect(linkHost("https://www.github.com/Decuayer/x")).toBe("github.com");
    expect(linkHost("mailto:a@b.c")).toBeNull();
    expect(linkHost("javascript:alert(1)")).toBeNull();
  });
});
