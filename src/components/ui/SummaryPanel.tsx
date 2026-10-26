import type { ReactNode } from "react";

/** Width of the progress bar in percent, clamped 0 to 100. Null hides the bar. */
export function progressWidth(collectedCents: number, expectedCents: number): number | null {
  if (expectedCents <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((collectedCents / expectedCents) * 100)));
}

export interface SummaryStat {
  label: string;
  value: ReactNode;
}

export interface SummaryPanelProps {
  label: string;
  figure: ReactNode;
  secondary?: ReactNode;
  progress?: { collectedCents: number; expectedCents: number; text: string };
  stats?: [SummaryStat, SummaryStat];
}

/** Solid deep-green panel. At most one per screen. */
export function SummaryPanel({ label, figure, secondary, progress, stats }: SummaryPanelProps) {
  const width = progress ? progressWidth(progress.collectedCents, progress.expectedCents) : null;
  return (
    <section className="yard-summary-panel relative overflow-hidden rounded-2xl bg-brand p-5 text-on-brand shadow-[0_12px_32px_rgb(31_95_63/0.16)] md:p-7" aria-label={label}>
      <p className="text-secondary text-on-brand-muted">{label}</p>
      <p className="money mt-1 text-figure font-semibold">{figure}</p>
      {secondary !== undefined && <p className="money text-secondary text-on-brand-muted">{secondary}</p>}
      {progress && width !== null && (
        <div className="mt-3">
          <div aria-hidden="true" className="h-1.5 w-full rounded-sm bg-brand-pressed">
            <div className="h-1.5 rounded-sm bg-on-brand" style={{ width: `${width}%` }} />
          </div>
          <span className="sr-only">{progress.text}</span>
        </div>
      )}
      {stats && (
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-secondary text-on-brand-muted">{stat.label}</dt>
              <dd className="money text-body font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
