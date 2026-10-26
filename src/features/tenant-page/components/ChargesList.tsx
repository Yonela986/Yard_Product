import { formatMonthLabel, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ListCard } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PublicTenantCharge } from "../charges";

const labels: Record<PublicTenantCharge["type"], string> = {
  rent: "Rent",
  electricity: "Electricity",
  water: "Water",
  other: "Other",
};

export function ChargesList({
  charges,
  isPending,
  isError,
}: {
  charges: PublicTenantCharge[];
  isPending: boolean;
  isError: boolean;
}) {
  if (isPending) {
    return <p className="text-secondary text-ink-muted">Loading charges...</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="text-secondary text-ink">
        Charges could not be loaded.
      </p>
    );
  }
  if (charges.length === 0) return null;
  return (
    <section className="space-y-2">
      <SectionHeader title="Charges" />
      <ListCard>
        {charges.map((charge) => (
          <li key={charge.id} className="list-none space-y-1 px-4 py-3">
            <div className="flex justify-between gap-3 text-body text-ink">
              <span className="font-semibold">
                {labels[charge.type]}, {formatMonthLabel(charge.period)}
              </span>
              <span className="shrink-0 money">{formatMoney(charge.amountCents)}</span>
            </div>
            <p className="text-secondary text-ink-muted">Due {formatShortDate(charge.dueDate)}</p>
            {charge.note && <p className="text-secondary text-ink">{charge.note}</p>}
          </li>
        ))}
      </ListCard>
    </section>
  );
}
