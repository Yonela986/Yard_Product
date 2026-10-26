import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({ title, action, backTo, backLabel = "Back" }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="yard-page-header">
      <div className="flex min-w-0 items-center gap-3">
        {backTo && (
          <button
            type="button"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-3 text-secondary font-semibold text-ink shadow-sm transition-colors hover:bg-neutral-tint active:bg-line"
            onClick={() => void navigate({ to: backTo })}
          >
            {backLabel}
          </button>
        )}
        <h1 className="truncate text-title font-semibold tracking-tight text-ink md:text-display">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
