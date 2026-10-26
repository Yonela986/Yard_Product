import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ActionTileProps {
  icon: LucideIcon;
  label: string;
  subLabel?: string | undefined;
  primary?: boolean;
  disabled?: boolean;
  to?: string;
  href?: string;
  onClick?: () => void;
}

/** Icon above a short label. A real button or link, at least 72px high. */
export function ActionTile({ icon: Icon, label, subLabel, primary, disabled, to, href, onClick }: ActionTileProps) {
  const className = cn(
    "yard-action-tile flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-secondary font-semibold transition-all duration-150",
    primary
      ? "border-brand bg-brand text-on-brand shadow-sm active:bg-brand-pressed"
      : "border-line bg-white text-ink shadow-[0_2px_5px_rgb(26_42_30/0.03)] active:bg-line",
    disabled && "cursor-not-allowed border-line bg-neutral-tint text-ink-muted",
  );
  const body = (
    <>
      <Icon aria-hidden="true" className="size-6 shrink-0" strokeWidth={1.75} />
      <span className="line-clamp-2 leading-tight">{label}</span>
      {subLabel && <span className="text-secondary font-normal leading-tight">{subLabel}</span>}
    </>
  );
  if (disabled) {
    return (
      <button type="button" disabled aria-disabled="true" className={className}>
        {body}
      </button>
    );
  }
  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
