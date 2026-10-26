import { InitialsTile } from "@/components/ui/InitialsTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { RowAmount } from "@/components/ui/RowAmount";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import type { TenantStatusGroup } from "@/features/charges/balance";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface StatusGroupProps {
  group: TenantStatusGroup;
  currentPeriodCharges: Map<string, number>;
  onTenantClick: (tenantId: string) => void;
  hideHeading?: boolean;
}

function summary(
  status: TenantStatusGroup["status"],
  tenant: TenantStatusGroup["tenants"][number],
  periodChargeCents: number,
): string {
  if (status === "late") {
    const amount =
      tenant.paidThisMonthCents > 0
        ? `Paid ${formatMoney(tenant.paidThisMonthCents)} of ${formatMoney(periodChargeCents)}, `
        : `Owes ${formatMoney(tenant.overdueCents)}, `;
    return `${amount}${tenant.daysLate} days late`;
  }
  if (status === "part_paid") {
    return `Paid ${formatMoney(tenant.paidThisMonthCents)} of ${formatMoney(periodChargeCents)}`;
  }
  if (status === "not_due") {
    const due = tenant.oldestUnpaidDueDate ? formatShortDate(tenant.oldestUnpaidDueDate) : "later";
    return `Owes ${formatMoney(tenant.balanceCents)}, due ${due}`;
  }
  return tenant.balanceCents < 0 ? `Credit ${formatMoney(Math.abs(tenant.balanceCents))}` : "Paid";
}

function title(status: TenantStatusGroup["status"]): string {
  switch (status) {
    case "late":
      return "Late";
    case "part_paid":
      return "Part paid";
    case "not_due":
      return "Not due";
    case "paid":
      return "Paid";
  }
}

export function StatusGroup({
  group,
  currentPeriodCharges,
  onTenantClick,
  hideHeading = false,
}: StatusGroupProps) {
  return (
    <section className="space-y-2">
      {!hideHeading && (
        <SectionHeader
          title={title(group.status)}
          dot={group.status}
          trailing={`${group.tenants.length}`}
        />
      )}
      <ListCard>
        {group.tenants.map((tenant) => (
          <ListRow
            key={tenant.tenantId}
            primary={tenant.name}
            secondary={`${tenant.roomName} · ${summary(
              group.status,
              tenant,
              currentPeriodCharges.get(tenant.tenantId) ??
                tenant.balanceCents + tenant.paidThisMonthCents,
            )}`}
            leading={<InitialsTile name={tenant.name} />}
            trailing={
              <>
                <RowAmount cents={Math.abs(tenant.balanceCents)} />
                <StatusTag variant={group.status} status={group.status} />
              </>
            }
            chevron
            onClick={() => onTenantClick(tenant.tenantId)}
            summary={`${tenant.name}, ${tenant.roomName}. ${summary(
              group.status,
              tenant,
              currentPeriodCharges.get(tenant.tenantId) ??
                tenant.balanceCents + tenant.paidThisMonthCents,
            )}. ${title(group.status)}.`}
          />
        ))}
      </ListCard>
    </section>
  );
}
