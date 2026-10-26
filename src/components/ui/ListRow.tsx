import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ListRowProps {
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  /** 40px leading slot: IconTile or InitialsTile. */
  leading?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  /** One phrase a screen reader reads for the whole row. */
  summary?: string;
}

/** Three-column row: leading tile, content, right-aligned trailing column. */
export function ListRow({
  primary,
  secondary,
  trailing,
  leading,
  chevron = false,
  onClick,
  summary,
}: ListRowProps) {
  const content = (
    <>
      {leading !== undefined && (
        <span className="flex w-10 shrink-0 justify-center" aria-hidden={summary ? true : undefined}>
          {leading}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col" aria-hidden={summary ? true : undefined}>
        <span className="truncate text-body font-semibold text-ink">{primary}</span>
        {secondary !== undefined && secondary !== "" && (
          <span className="truncate text-secondary text-ink-muted">{secondary}</span>
        )}
      </span>
      {trailing !== undefined && (
        <span
          className="flex min-w-24 shrink-0 flex-col items-end gap-1 text-right text-body"
          aria-hidden={summary ? true : undefined}
        >
          {trailing}
        </span>
      )}
      {chevron && (
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
      )}
      {summary && <span className="sr-only">{summary}</span>}
    </>
  );
  const base = "flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors";

  return (
    <li className="list-none">
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(base, "hover:bg-ground active:bg-line")}>
          {content}
        </button>
      ) : (
        <div className={base}>{content}</div>
      )}
    </li>
  );
}

/** White bordered list card that holds ListRows. */
export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_4px_rgb(26_42_30/0.03),0_8px_24px_rgb(26_42_30/0.03)]", className)}>
      {children}
    </ul>
  );
}
