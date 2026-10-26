import { StatusTag } from "@/components/ui/StatusTag";
import type { RentStatus } from "@/types/domain";
import { formatMoney } from "@/lib/money";

interface BalanceBlockProps {
  balanceCents: number;
  status: RentStatus;
  daysLate: number;
}

export function BalanceBlock({ balanceCents, status, daysLate }: BalanceBlockProps) {
  const tone = {
    paid: "border-status-paid-tint bg-status-paid-tint",
    part_paid: "border-status-part-tint bg-status-part-tint",
    late: "border-status-late-tint bg-status-late-tint",
    not_due: "border-status-neutral-tint bg-status-neutral-tint",
  }[status];
  const amount =
    balanceCents < 0
      ? `Credit ${formatMoney(Math.abs(balanceCents))}`
      : balanceCents === 0
        ? "Paid up"
        : `Owes ${formatMoney(balanceCents)}`;

  return (
    <section className={`rounded-md border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-secondary text-ink-muted">Balance</p>
          <p className="mt-1 money text-figure font-semibold text-ink">{amount}</p>
          {status === "late" && (
            <p className="mt-1 text-secondary text-ink">{daysLate} days late</p>
          )}
        </div>
        <StatusTag status={status} />
      </div>
    </section>
  );
}
