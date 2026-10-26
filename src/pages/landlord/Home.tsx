import { Link, useNavigate } from "@tanstack/react-router";
import { HousePlus } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SummaryPanel } from "@/components/ui/SummaryPanel";
import { Sheet } from "@/components/ui/Sheet";
import {
  daysLate,
  deriveStatus,
  groupTenantsByStatus,
  summariseMonth,
  type TenantStatusItem,
} from "@/features/charges/balance";
import {
  HomeQuickActions,
  HomeSetupSteps,
  HomeTenantGroups,
} from "@/features/dashboard/components/HomeSections";
import { useMonthCharges, usePeriodPayments, useTenantBalances } from "@/features/charges/hooks";
import { useLandlord } from "@/features/auth/hooks";
import {
  buildUpcomingReminderCandidates,
  DEFAULT_UPCOMING_REMINDER_DAYS,
} from "@/features/messaging/reminders";
import { useActiveRooms } from "@/features/rooms/hooks";
import { useCurrentTenants } from "@/features/tenants/hooks";
import { usePendingPayments } from "@/features/payments/hooks";
import { formatMonthLabel, todayInSA, toPeriod } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paths } from "@/router/paths";
import { StatusTag } from "@/components/ui/StatusTag";

export default function Home() {
  const navigate = useNavigate();
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false);
  const landlord = useLandlord();
  const period = toPeriod(todayInSA());
  const tenants = useCurrentTenants();
  const rooms = useActiveRooms();
  const balances = useTenantBalances();
  const charges = useMonthCharges(period);
  const payments = usePeriodPayments(period);
  const pendingPayments = usePendingPayments();
  const queries = [tenants, rooms, balances, charges, payments];

  if (queries.some((query) => query.isPending)) {
    return (
      <>
        <PageHeader title="Dashboard" />
        {pendingPayments.isSuccess && pendingPayments.data.length > 0 && (
          <Button
            variant="secondary"
            className="mb-4"
            onClick={() => void navigate({ to: paths.pendingPayments })}
          >
            {pendingPayments.data.length}{" "}
            {pendingPayments.data.length === 1 ? "payment" : "payments"} waiting for you to confirm
          </Button>
        )}
        {pendingPayments.isError && (
          <p role="alert" className="mb-4 text-secondary text-ink">
            Waiting payments could not be loaded.{" "}
            <Link to={paths.pendingPayments} className="underline">
              Try again
            </Link>
          </p>
        )}
        <p className="py-6 text-body text-ink-muted">Loading</p>
      </>
    );
  }

  if (queries.some((query) => query.isError)) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="space-y-4 py-6">
          <p className="text-body text-ink">Could not load your tenants. Check your connection.</p>
          <Button
            variant="secondary"
            onClick={() => void Promise.all(queries.map((query) => query.refetch()))}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  const currentTenants = tenants.data ?? [];
  const currentRooms = new Map((rooms.data ?? []).map((room) => [room.id, room]));
  const tenantByRoom = new Map(currentTenants.map((tenant) => [tenant.room_id, tenant]));
  const tenantBalances = new Map(
    (balances.data ?? []).map((balance) => [balance.tenantId, balance]),
  );
  const currentBalanceRows = currentTenants.flatMap((tenant) => {
    const balance = tenantBalances.get(tenant.id);
    return balance ? [balance] : [];
  });
  const monthSummary = summariseMonth(
    period,
    charges.data ?? [],
    payments.data ?? [],
    currentBalanceRows,
  );
  const hasPaymentsThisMonth = (payments.data ?? []).some(
    (payment) => payment.status === "confirmed",
  );
  const currentPeriodCharges = new Map<string, number>();
  for (const charge of charges.data ?? []) {
    currentPeriodCharges.set(
      charge.tenant_id,
      (currentPeriodCharges.get(charge.tenant_id) ?? 0) + charge.amount_cents,
    );
  }
  const today = todayInSA();
  const statusItems: TenantStatusItem[] = currentTenants.flatMap((tenant) => {
    const balance = tenantBalances.get(tenant.id);
    if (!balance) return [];
    const room = currentRooms.get(tenant.room_id);
    const status = deriveStatus(balance);
    return [
      {
        tenantId: tenant.id,
        name: tenant.name,
        roomName: room?.name ?? "Room unavailable",
        balanceCents: balance.balanceCents,
        paidCents: balance.paidCents,
        overdueCents: balance.overdueCents,
        paidThisMonthCents: balance.paidThisMonthCents,
        oldestUnpaidDueDate: balance.oldestUnpaidDueDate,
        status,
        daysLate: status === "late" ? daysLate(balance.oldestUnpaidDueDate, today) : 0,
      },
    ];
  });
  const groups = groupTenantsByStatus(statusItems);
  const upcomingCount = buildUpcomingReminderCandidates(
    currentTenants,
    rooms.data ?? [],
    balances.data ?? [],
    [],
    today,
    landlord.data?.upcoming_reminder_days ?? DEFAULT_UPCOMING_REMINDER_DAYS,
  ).length;

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="space-y-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.85fr)] lg:items-start">
        <section aria-labelledby="month-heading" className="space-y-3">
          <h2 id="month-heading" className="text-title font-semibold text-ink">
            {formatMonthLabel(period)}
          </h2>
          <SummaryPanel
            label="Collected this month"
            figure={formatMoney(monthSummary.collectedCents)}
            secondary={`of ${formatMoney(monthSummary.expectedCents)} expected`}
            progress={{
              collectedCents: monthSummary.collectedCents,
              expectedCents: monthSummary.expectedCents,
              text: `${monthSummary.expectedCents > 0 ? Math.min(100, Math.max(0, Math.round((monthSummary.collectedCents / monthSummary.expectedCents) * 100))) : 0}% of expected rent collected`,
            }}
            stats={[
              { label: "Outstanding", value: formatMoney(monthSummary.outstandingCents) },
              { label: "Due soon", value: String(upcomingCount) },
            ]}
          />
        </section>

        <section aria-labelledby="actions-heading" className="rounded-xl border border-line bg-surface p-4 md:p-5">
          <SectionHeader title="Quick actions" id="actions-heading" />
          <HomeQuickActions
            hasLateTenants={groups.some((group) => group.status === "late")}
            onRecordPayment={() => setPaymentPickerOpen(true)}
          />
        </section>
        </div>

        {pendingPayments.isError ? (
          <p role="alert" className="text-secondary text-ink">
            Payments waiting for confirmation could not be loaded.
          </p>
        ) : (
          pendingPayments.data &&
          pendingPayments.data.length > 0 && (
            <section>
              <SectionHeader
                title="Payments to confirm"
                trailing={String(pendingPayments.data.length)}
              />
              <ListCard>
                <ListRow
                  primary={`${pendingPayments.data.length} tenant ${pendingPayments.data.length === 1 ? "payment" : "payments"}`}
                  secondary="Review and confirm submitted payments"
                  leading={<InitialsTile name="Payments" />}
                  trailing={`${pendingPayments.data.length} waiting`}
                  chevron
                  onClick={() => void navigate({ to: paths.pendingPayments })}
                  summary={`${pendingPayments.data.length} payments to confirm`}
                />
              </ListCard>
            </section>
          )
        )}

        {(rooms.data ?? []).some((room) => !tenantByRoom.has(room.id)) && (
          <section>
            <SectionHeader title="Vacant rooms" />
            <ListCard>
              {(rooms.data ?? [])
                .filter((room) => !tenantByRoom.has(room.id))
                .map((room) => (
                  <ListRow
                    key={room.id}
                    primary={room.name}
                    secondary={`${formatMoney(room.monthly_rent_cents)} · Due day ${room.due_day}`}
                    leading={<HousePlus aria-hidden="true" className="size-5 text-brand" />}
                    trailing={<StatusTag variant="vacant" />}
                    chevron
                    onClick={() =>
                      void navigate({ to: paths.roomDetail.replace("$roomId", room.id) })
                    }
                  />
                ))}
            </ListCard>
          </section>
        )}

        {(!(rooms.data ?? []).length || !currentTenants.length || !hasPaymentsThisMonth) && (
          <section className="space-y-3">
            <SectionHeader title="Get started" />
            <p className="text-secondary text-ink-muted">
              Add rooms, welcome tenants and record your first payment.
            </p>
            <HomeSetupSteps
              roomsAdded={(rooms.data ?? []).length > 0}
              tenantsAdded={currentTenants.length > 0}
              paymentsRecorded={hasPaymentsThisMonth}
            />
            <Button variant="secondary" onClick={() => void navigate({ to: paths.rooms })}>
              Open rooms
            </Button>
          </section>
        )}

        {currentTenants.length > 0 ? (
          <section className="space-y-4">
            <SectionHeader
              title="Tenants"
              trailing={
                <span className="flex items-center gap-3">
                  <span>{currentTenants.length}</span>
                  <Link
                    to={paths.tenants}
                    className="font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    View all
                  </Link>
                </span>
              }
            />
            <HomeTenantGroups
              groups={groups}
              currentPeriodCharges={currentPeriodCharges}
              onTenantClick={(tenantId) =>
                void navigate({ to: paths.tenantDetail.replace("$tenantId", tenantId) })
              }
            />
          </section>
        ) : (
          <p className="text-secondary text-ink-muted">
            Add a tenant to start tracking rent and payments.
          </p>
        )}
      </div>
      <Sheet
        open={paymentPickerOpen}
        onOpenChange={setPaymentPickerOpen}
        title="Choose a tenant"
        description="Select who made the payment."
      >
        {currentTenants.length === 0 ? (
          <p className="text-secondary text-ink-muted">Add a tenant before recording a payment.</p>
        ) : (
          <ListCard>
            {currentTenants.map((tenant) => {
              const room = currentRooms.get(tenant.room_id);
              const balance = tenantBalances.get(tenant.id);
              return (
                <ListRow
                  key={tenant.id}
                  primary={tenant.name}
                  secondary={room?.name ?? "Room unavailable"}
                  leading={<InitialsTile name={tenant.name} />}
                  trailing={balance ? formatMoney(balance.balanceCents) : "Balance unavailable"}
                  chevron
                  onClick={() => {
                    setPaymentPickerOpen(false);
                    void navigate({
                      to: paths.recordPayment.replace("$tenantId", tenant.id),
                    });
                  }}
                />
              );
            })}
          </ListCard>
        )}
      </Sheet>
    </>
  );
}
