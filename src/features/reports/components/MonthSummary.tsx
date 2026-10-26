import { formatMoney } from "@/lib/money";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { RowAmount } from "@/components/ui/RowAmount";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SummaryPanel } from "@/components/ui/SummaryPanel";
import {
  PAYMENT_METHOD_LABELS,
  UTILITY_LABELS,
  type ChargeType,
  type MonthDetail,
  type PaymentMethod,
} from "@/types/domain";

const CHARGE_LABELS: Record<ChargeType, string> = {
  rent: "Rent",
  electricity: UTILITY_LABELS.electricity,
  water: UTILITY_LABELS.water,
  other: "Other",
};

function Breakdown<T extends string>({
  title,
  entries,
}: {
  title: string;
  entries: Array<[T, number, string]>;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title={title} />
      <ListCard>
        {entries.map(([key, amount, label]) => (
          <ListRow key={key} primary={label} trailing={<RowAmount cents={amount} />} />
        ))}
      </ListCard>
    </section>
  );
}

export function MonthSummary({ detail }: { detail: MonthDetail }) {
  const charged = (Object.entries(detail.chargedByType) as Array<[ChargeType, number]>).map(
    ([type, amount]) => [type, amount, CHARGE_LABELS[type]] as [ChargeType, number, string],
  );
  const received = (Object.entries(detail.receivedByMethod) as Array<[PaymentMethod, number]>).map(
    ([method, amount]) =>
      [method, amount, PAYMENT_METHOD_LABELS[method]] as [PaymentMethod, number, string],
  );
  const chargedTotal = charged.reduce((total, [, amount]) => total + amount, 0);
  const receivedTotal = received.reduce((total, [, amount]) => total + amount, 0);
  return (
    <div className="space-y-5">
      <SummaryPanel
        label="Received this month"
        figure={formatMoney(receivedTotal)}
        stats={[
          { label: "Total charged", value: formatMoney(chargedTotal) },
          { label: "Payment methods", value: String(detail.payments.length) },
        ]}
      />
      <Breakdown title="Charged" entries={charged} />
      <Breakdown title="Received" entries={received} />
    </div>
  );
}
