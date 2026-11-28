import type { LanguageShare } from "@/lib/projects/readme";

/** GitHub-style language distribution bar with a legend. */
export function LanguageBar({ shares, label }: { shares: LanguageShare[]; label: string }) {
  if (shares.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={label}>
        {shares.map((s) => (
          <span key={s.name} style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {shares.map((s) => (
          <li key={s.name} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-foreground">{s.name}</span>
            {s.percent}%
          </li>
        ))}
      </ul>
    </div>
  );
}
