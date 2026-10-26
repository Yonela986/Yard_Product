import type { LucideIcon } from "lucide-react";

import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/** 40px brand-tint tile with a deep-green outline icon. Decorative. */
export function IconTile({ icon: Icon, size = 40 }: { icon: LucideIcon; size?: 40 | 48 }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand",
        size === 48 ? "size-12" : "size-10",
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/** Neutral-tint tile with the person's initials. Decorative; the name is shown beside it. */
export function InitialsTile({ name, size = 40 }: { name: string; size?: 40 | 48 }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-neutral-tint text-secondary font-semibold text-ink",
        size === 48 ? "size-12 text-body" : "size-10",
      )}
    >
      {initials(name)}
    </span>
  );
}
