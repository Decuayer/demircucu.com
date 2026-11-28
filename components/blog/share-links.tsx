"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, Share2 } from "lucide-react";
import { LinkedinIcon, TwitterIcon } from "@/components/icons";
import { shareLinks } from "@/lib/blog/share";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => {};
/** Only touch devices get the native sheet; desktop browsers' own sheets add little here. */
const nativeShareAvailable = () =>
  typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Share links for a post (phase 8): X, LinkedIn, copy link and, where the device offers one,
 * the native share sheet (Web Share API). Plain links, no third-party scripts. The copy result
 * is announced through a polite live region.
 */
export function ShareLinks({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const t = useTranslations("blog");
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const canShare = useSyncExternalStore(noSubscribe, nativeShareAvailable, () => false);
  const links = shareLinks(url, title);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("failed");
    }
  };

  const item =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground";

  return (
    <div
      role="group"
      aria-label={t("shareThisPost")}
      data-testid="share-links"
      className={cn("flex items-center gap-2", className)}
    >
      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("shareOn", { network: "X" })}
        className={item}
      >
        <TwitterIcon aria-hidden className="h-4 w-4" />
      </a>
      <a
        href={links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("shareOn", { network: "LinkedIn" })}
        className={item}
      >
        <LinkedinIcon aria-hidden className="h-4 w-4" />
      </a>
      <button type="button" onClick={copy} aria-label={t("copyLink")} className={item}>
        {copied === "ok" ? (
          <Check aria-hidden className="h-4 w-4 text-success" />
        ) : (
          <Link2 aria-hidden className="h-4 w-4" />
        )}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          aria-label={t("shareNative")}
          className={item}
        >
          <Share2 aria-hidden className="h-4 w-4" />
        </button>
      )}
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {copied === "ok" ? t("linkCopied") : copied === "failed" ? t("copyFailed") : ""}
      </span>
    </div>
  );
}
