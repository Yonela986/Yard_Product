import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** A single-level card. Cards never nest. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("yard-card rounded-2xl border border-line bg-surface p-5", className)} {...rest} />
  );
}
