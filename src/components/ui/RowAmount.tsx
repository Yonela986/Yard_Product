import { formatMoney } from "@/lib/money";

/** Right-aligned amount with tabular figures. Amounts are never coloured. */
export function RowAmount({ cents }: { cents: number }) {
  return (
    <span className="money block min-w-20 text-right text-body font-semibold whitespace-nowrap text-ink">
      {formatMoney(cents)}
    </span>
  );
}
