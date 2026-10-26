import type { ReactNode } from "react";

import { StatusDot, type StatusVariant } from "./StatusTag";

export function SectionHeader({
  title,
  dot,
  trailing,
  id,
}: {
  title: string;
  dot?: StatusVariant;
  trailing?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-body font-semibold text-ink">
        {dot && <StatusDot variant={dot} />}
        {title}
      </h2>
      {trailing !== undefined && <span className="text-secondary text-ink-muted">{trailing}</span>}
    </div>
  );
}
