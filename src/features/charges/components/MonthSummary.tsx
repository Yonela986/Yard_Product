import { formatMonthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface MonthSummaryProps {
  period: string;
  collectedCents: number;
  expectedCents: number;
  outstandingCents: number;
}

export function MonthSummary({
  period,
  collectedCents,
  expectedCents,
  outstandingCents,
}: MonthSummaryProps) {
  return (
    <section className="mb-6 border-b border-line pb-5">
      <p className="text-body text-ink-muted">{formatMonthLabel(period)}</p>
      <p className="mt-1 text-title font-semibold text-ink">
        {formatMoney(collectedCents)} of {formatMoney(expectedCents)} collected
      </p>
      <p className="mt-1 text-secondary text-ink">
        Outstanding in total: {formatMoney(outstandingCents)}
      </p>
    </section>
  );
}
