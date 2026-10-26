import {
  CreditCard,
  Droplets,
  HousePlus,
  MessageCircle,
  ReceiptText,
  UserRoundPlus,
} from "lucide-react";

import { ActionTile } from "@/components/ui/ActionTile";
import { StatusGroup } from "@/features/charges/components/StatusGroup";
import type { TenantStatusGroup } from "@/features/charges/balance";
import { StepFlow } from "@/components/ui/StepFlow";
import { paths } from "@/router/paths";

export function HomeQuickActions({
  hasLateTenants,
  onRecordPayment,
}: {
  hasLateTenants: boolean;
  onRecordPayment: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionTile icon={CreditCard} label="Record payment" onClick={onRecordPayment} />
      <ActionTile icon={UserRoundPlus} label="Add tenant" to={paths.tenantNew} />
      <ActionTile icon={Droplets} label="Add utility bill" to={paths.utilityNew} />
      {hasLateTenants ? (
        <ActionTile icon={MessageCircle} label="Remind late" to={paths.remind} />
      ) : (
        <ActionTile icon={MessageCircle} label="Remind late" subLabel="No one is late" disabled />
      )}
    </div>
  );
}

export function HomeSetupSteps({
  roomsAdded,
  tenantsAdded,
  paymentsRecorded,
}: {
  roomsAdded: boolean;
  tenantsAdded: boolean;
  paymentsRecorded: boolean;
}) {
  return (
    <StepFlow
      steps={[
        {
          icon: HousePlus,
          title: "Add rooms",
          line: roomsAdded ? "Rooms are ready." : "Set rent and due day.",
        },
        {
          icon: UserRoundPlus,
          title: "Add tenants",
          line: tenantsAdded ? "Tenants are on your list." : "Give each tenant a room.",
        },
        {
          icon: ReceiptText,
          title: "Record a payment",
          line: paymentsRecorded ? "A payment is recorded this month." : "Start your rent record.",
        },
      ]}
    />
  );
}

export function HomeTenantGroups({
  groups,
  currentPeriodCharges,
  onTenantClick,
}: {
  groups: TenantStatusGroup[];
  currentPeriodCharges: Map<string, number>;
  onTenantClick: (tenantId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) =>
        group.status === "paid" ? (
          <details key={group.status} className="space-y-2">
            <summary className="min-h-11 cursor-pointer py-2 text-body font-semibold text-ink">
              Paid ({group.tenants.length})
            </summary>
            <StatusGroup
              group={group}
              currentPeriodCharges={currentPeriodCharges}
              onTenantClick={onTenantClick}
              hideHeading
            />
          </details>
        ) : (
          <StatusGroup
            key={group.status}
            group={group}
            currentPeriodCharges={currentPeriodCharges}
            onTenantClick={onTenantClick}
          />
        ),
      )}
    </div>
  );
}
