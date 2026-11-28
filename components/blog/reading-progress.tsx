"use client";

import { useEffect, useRef } from "react";

/**
 * Reading progress (phase 8): a 2px bar under the sticky header that fills as the article body
 * scrolls past, from its top reaching the header to its end reaching the bottom of the screen.
 * Decorative (`aria-hidden`); updated once per frame from a passive scroll listener.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !bar.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const header = 64;
      const rect = target.getBoundingClientRect();
      const distance = rect.height - (window.innerHeight - header);
      const scrolled = header - rect.top;
      const progress = distance <= 0 ? (scrolled > 0 ? 1 : 0) : scrolled / distance;
      const value = Math.min(1, Math.max(0, progress));
      bar.current!.style.transform = `scaleX(${value})`;
      track.current!.dataset.progress = value.toFixed(2);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <div
      ref={track}
      aria-hidden
      data-testid="reading-progress"
      data-progress="0.00"
      className="pointer-events-none fixed inset-x-0 top-16 z-40 h-0.5"
    >
      {/* Inline transform only: Tailwind's scale-* utilities set `scale`, which would multiply. */}
      <div ref={bar} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
