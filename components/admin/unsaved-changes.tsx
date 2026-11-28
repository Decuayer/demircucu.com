"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formSnapshot, isGuardedClick } from "@/lib/forms/dirty";

/**
 * Unsaved-changes warning for admin forms (phase 8, decision 9a).
 *
 * `UnsavedChangesProvider` (admin layout) holds the set of dirty forms. While one is dirty:
 * same-origin link clicks anywhere on the page (menu, header, "back to site") wait for a
 * confirmation dialog, and reloading, closing the tab or leaving for another site gets the
 * browser's own `beforeunload` prompt. Forms register through `useUnsavedChanges(dirty)` and route
 * their own navigation ("Cancel") through `confirmLeave`; after a successful save they call
 * `leave` so the redirect is not held.
 *
 * The browser's back / forward buttons cannot be held in the App Router; with Cache Components
 * the previous page is kept (Activity) and the form still holds its values on return (1a). Hidden
 * pages run no effects, so a form that is navigated away from stops guarding until it is shown
 * again.
 */

interface UnsavedChangesContextValue {
  setDirty(id: string, dirty: boolean): void;
  /** Runs `action` at once when nothing is dirty, otherwise after the user confirms. */
  confirmLeave(action: () => void): void;
  /** Runs `action` without asking (after a save), until the next page is shown. */
  leave(action: () => void): void;
}

const passthrough: UnsavedChangesContextValue = {
  setDirty: () => {},
  confirmLeave: (action) => action(),
  leave: (action) => action(),
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>(passthrough);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const dirtyForms = useRef(new Set<string>());
  const [anyDirty, setAnyDirty] = useState(false);
  const released = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  // A new page is showing: guards apply again.
  useEffect(() => {
    released.current = false;
  }, [pathname]);

  const anyDirtyRef = useRef(false);
  useEffect(() => {
    anyDirtyRef.current = anyDirty;
  }, [anyDirty]);
  const guarding = useCallback(() => anyDirtyRef.current && !released.current, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    // A form that becomes dirty after an earlier "leave" (e.g. another tag opened in the same
    // page) is guarded again.
    if (dirty && dirtyForms.current.size === 0) released.current = false;
    if (dirty) dirtyForms.current.add(id);
    else dirtyForms.current.delete(id);
    setAnyDirty(dirtyForms.current.size > 0);
  }, []);

  const leave = useCallback((action: () => void) => {
    released.current = true;
    action();
  }, []);

  const confirmLeave = useCallback(
    (action: () => void) => {
      if (!guarding()) action();
      else setPending(() => action);
    },
    [guarding],
  );

  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (released.current) return;
      event.preventDefault();
      // Older browsers need a return value; the text itself is the browser's.
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (released.current) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isGuardedClick(event, anchor, window.location.href)) return;
      // Capture phase: runs before the link's own handler (next/link) and stops it.
      event.preventDefault();
      event.stopPropagation();
      const url = new URL(anchor.href);
      setPending(() => () => router.push(`${url.pathname}${url.search}${url.hash}`));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [anyDirty, router]);

  const value = useMemo(() => ({ setDirty, confirmLeave, leave }), [setDirty, confirmLeave, leave]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent data-testid="unsaved-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unsavedDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* First in the footer, so it has the initial focus: staying is the safe choice. */}
            <AlertDialogCancel>{t("unsavedStay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const action = pending;
                setPending(null);
                if (action) leave(action);
              }}
            >
              {t("unsavedLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}

/** Reports a form's dirty state to the provider and returns its navigation helpers. */
export function useUnsavedChanges(dirty: boolean) {
  const id = useId();
  const context = useContext(UnsavedChangesContext);
  const { setDirty } = context;
  useEffect(() => {
    setDirty(id, dirty);
    return () => setDirty(id, false);
  }, [id, dirty, setDirty]);
  return { confirmLeave: context.confirmLeave, leave: context.leave };
}

/** Navigation helpers for components that switch forms without owning one (e.g. a tag list). */
export function useLeaveConfirm() {
  const { confirmLeave, leave } = useContext(UnsavedChangesContext);
  return { confirmLeave, leave };
}

/**
 * Dirty state of a form from its values: compared with the values it opened with, or those of
 * the last `markSaved()` (forms that stay on the page after saving).
 */
export function useFormBaseline(values: unknown) {
  const current = formSnapshot(values);
  const [baseline, setBaseline] = useState(current);
  const markSaved = useCallback(() => setBaseline(current), [current]);
  return { dirty: current !== baseline, markSaved };
}

/** "Unsaved changes" next to a form's save button; announced politely when it appears. */
export function UnsavedBadge({ dirty }: { dirty: boolean }) {
  const t = useTranslations("admin");
  return (
    <span role="status" aria-live="polite" className="contents">
      {dirty && (
        <Badge
          variant="outline"
          data-testid="unsaved-badge"
          className="border-amber-500/50 text-amber-700 dark:text-amber-400"
        >
          {t("unsavedBadge")}
        </Badge>
      )}
    </span>
  );
}
