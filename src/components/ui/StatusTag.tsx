import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/domain";

export type StatusVariant = PaymentStatus | "vacant" | "inactive";

const config: Record<StatusVariant, { label: string; tag: string; dot: string }> = {
  paid: { label: "Paid", tag: "bg-status-paid-tint text-status-paid-ink", dot: "bg-status-paid" },
  part_paid: {
    label: "Part paid",
    tag: "bg-status-part-tint text-status-part-ink-v2",
    dot: "bg-status-part",
  },
  late: { label: "Late", tag: "bg-status-late-tint text-status-late-ink", dot: "bg-status-late" },
  not_due: {
    label: "Not due",
    tag: "bg-status-neutral-tint text-status-neutral-ink",
    dot: "bg-status-neutral",
  },
  vacant: { label: "Vacant", tag: "bg-neutral-tint text-ink", dot: "bg-status-neutral" },
  inactive: { label: "Inactive", tag: "bg-neutral-tint text-ink", dot: "bg-status-neutral" },
};

export function statusLabel(variant: StatusVariant): string {
  return config[variant].label;
}

export function StatusDot({ variant }: { variant: StatusVariant }) {
  return (
    <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", config[variant].dot)} />
  );
}

/** Payment status or occupancy label. The word is always shown; colour is never the only signal. */
export function StatusTag({ status, variant }: { status?: PaymentStatus; variant?: StatusVariant }) {
  const key = variant ?? status ?? "not_due";
  const { label, tag } = config[key];
  return (
    <span
      className={cn(
        "yard-status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-secondary font-semibold whitespace-nowrap",
        tag,
      )}
    >
      <StatusDot variant={key} />
      {label}
    </span>
  );
}
