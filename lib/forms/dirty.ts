/**
 * Unsaved-changes detection for admin forms (phase 8, decision 9a): a form is "dirty" when a
 * snapshot of its current values differs from the snapshot taken when it opened (or was last
 * saved). Undoing a change makes it clean again. Object keys are compared in sorted order; array
 * order matters (tag and file order is saved); `null`, `undefined`, "" and an invalid date count
 * as the same empty value. Client-safe, pure.
 */

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, normalize((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function formSnapshot(values: unknown): string {
  return JSON.stringify(normalize(values));
}

/** Whether a same-origin link click should be held for confirmation (not a new tab, download…). */
export function isGuardedClick(
  event: Pick<
    MouseEvent,
    "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented"
  >,
  anchor: { href: string; target: string; hasAttribute(name: string): boolean },
  current: string,
): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return false;
  let to: URL;
  let from: URL;
  try {
    to = new URL(anchor.href, current);
    from = new URL(current);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false; // left to beforeunload
  // Same page with only another hash: nothing is lost.
  return !(to.pathname === from.pathname && to.search === from.search);
}
