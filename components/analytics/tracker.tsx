"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isUntrackedArea } from "@/lib/analytics/paths";
import { OUTBOUND_TARGETS } from "@/lib/analytics/constants";

/** Neutral path: "/track"-style paths are on ad / tracking blocker lists (docs/analytics.md). */
const ENDPOINT = "/api/e";

interface CurrentView {
  id: string;
  path: string;
  visibleMs: number;
  visibleSince: number | null;
  maxScroll: number;
}

/** Do Not Track or Global Privacy Control: nothing is sent at all. */
export function hasOptedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1" || win.doNotTrack === "1";
}

function send(body: object, beacon: boolean): void {
  const json = JSON.stringify(body);
  try {
    if (beacon && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(ENDPOINT, new Blob([json], { type: "application/json" }))) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      body: json,
      headers: { "content-type": "application/json" },
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the page.
  }
}

function scrollDepth(): number {
  const doc = document.documentElement;
  const height = Math.max(doc.scrollHeight, 1);
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100));
}

function utm(search: URLSearchParams) {
  const pick = (key: string) => search.get(key)?.slice(0, 100) || undefined;
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
  };
}

function flush(view: CurrentView | null): void {
  if (!view) return;
  const now = performance.now();
  const durationMs = Math.round(view.visibleMs + (view.visibleSince ? now - view.visibleSince : 0));
  if (durationMs <= 0) return;
  send(
    {
      type: "engagement",
      id: view.id,
      durationMs: Math.min(durationMs, 6 * 60 * 60 * 1000),
      scrollDepth: view.maxScroll,
    },
    true,
  );
}

/**
 * Cookieless page view tracking (see docs/analytics.md). Sends one view per client-side route,
 * engaged (visible) time and scroll depth when the page is left or hidden, and clicks on
 * external links. Renders nothing.
 */
export function Analytics() {
  const pathname = usePathname();
  const current = useRef<CurrentView | null>(null);
  const firstView = useRef(true);

  useEffect(() => {
    if (hasOptedOut() || typeof crypto.randomUUID !== "function") return;
    if (isUntrackedArea(pathname)) {
      current.current = null;
      return;
    }
    const view: CurrentView = {
      id: crypto.randomUUID(),
      path: pathname,
      visibleMs: 0,
      visibleSince: document.visibilityState === "visible" ? performance.now() : null,
      maxScroll: scrollDepth(),
    };
    current.current = view;
    const referrer = firstView.current ? document.referrer || undefined : undefined;
    firstView.current = false;
    send(
      {
        type: "view",
        id: view.id,
        path: pathname,
        referrer,
        ...utm(new URLSearchParams(window.location.search)),
      },
      false,
    );
    return () => {
      flush(view);
      if (current.current === view) current.current = null;
    };
  }, [pathname]);

  useEffect(() => {
    if (hasOptedOut()) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const view = current.current;
        if (view) view.maxScroll = Math.max(view.maxScroll, scrollDepth());
      });
    };
    const onVisibility = () => {
      const view = current.current;
      if (!view) return;
      if (document.visibilityState === "hidden") {
        if (view.visibleSince !== null) {
          view.visibleMs += performance.now() - view.visibleSince;
          view.visibleSince = null;
        }
        flush(view);
      } else if (view.visibleSince === null) {
        view.visibleSince = performance.now();
      }
    };
    const onPageHide = () => flush(current.current);
    const onClick = (event: MouseEvent) => {
      const view = current.current;
      if (!view || (event.type === "auxclick" && event.button !== 1)) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const claimed = anchor.dataset.track?.toUpperCase();
      const target = (OUTBOUND_TARGETS as readonly string[]).includes(claimed ?? "")
        ? claimed
        : undefined;
      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (!target && url.host === window.location.host) return;
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      send({ type: "outbound", id: view.id, path: view.path, href: url.href, target }, true);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, []);

  return null;
}
