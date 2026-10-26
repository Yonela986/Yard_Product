import { useMemo } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/ListRow";
import { useLandlord } from "@/features/auth/hooks";
import { useTenantBalances } from "@/features/charges/hooks";
import { RemindLateRow } from "@/features/messaging/components/RemindLateRow";
import { composeReminder, type ComposedMessage } from "@/features/messaging/compose";
import { useRecentMessageLog, useRecordMessageOpened } from "@/features/messaging/hooks";
import {
  buildReminderCandidates,
  buildUpcomingReminderCandidates,
  DEFAULT_UPCOMING_REMINDER_DAYS,
  latestMessageByTenantKind,
  selectNextReminder,
  sortReminderCandidates,
} from "@/features/messaging/reminders";
import { firstName } from "@/features/messaging/render";
import { buildWhatsAppUrl } from "@/features/messaging/whatsapp";
import { useActiveRooms } from "@/features/rooms/hooks";
import { useCurrentTenants } from "@/features/tenants/hooks";
import { formatShortDate, todayInSA } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export default function RemindLate() {
  const landlord = useLandlord();
  const tenants = useCurrentTenants();
  const rooms = useActiveRooms();
  const balances = useTenantBalances();
  const log = useRecentMessageLog();
  const recordMessage = useRecordMessageOpened();
  const queries = [landlord, tenants, rooms, balances, log];
  const today = todayInSA();

  const candidates = useMemo(
    () =>
      buildReminderCandidates(
        tenants.data ?? [],
        rooms.data ?? [],
        balances.data ?? [],
        log.data ?? [],
        today,
      ),
    [tenants.data, rooms.data, balances.data, log.data, today],
  );
  const upcomingDays = landlord.data?.upcoming_reminder_days ?? DEFAULT_UPCOMING_REMINDER_DAYS;
  const upcoming = useMemo(
    () =>
      buildUpcomingReminderCandidates(
        tenants.data ?? [],
        rooms.data ?? [],
        balances.data ?? [],
        log.data ?? [],
        today,
        upcomingDays,
      ),
    [tenants.data, rooms.data, balances.data, log.data, today, upcomingDays],
  );
  const sortedCandidates = sortReminderCandidates(candidates, today);
  const next = selectNextReminder(candidates, new Date());
  const latest = latestMessageByTenantKind(log.data ?? []);

  if (queries.some((query) => query.isPending)) {
    return (
      <>
        <PageHeader title="Reminders" backTo="/home" />
        <p className="py-6 text-body text-ink-muted">Loading late tenants...</p>
      </>
    );
  }
  if (queries.some((query) => query.isError) || !landlord.data) {
    return (
      <>
        <PageHeader title="Reminders" backTo="/home" />
        <p role="alert" className="py-6 text-body text-ink">
          Late tenant details could not be loaded. Check your connection and try again.
        </p>
      </>
    );
  }
  const landlordData = landlord.data;

  let nextUrl = "";
  let nextMessage: ComposedMessage | null = null;
  let nextError = "";
  if (next) {
    try {
      nextMessage = composeReminder(
        next.tenant,
        next.room,
        next.balance,
        landlordData.reminder_tone,
        today,
      );
      nextUrl = buildWhatsAppUrl(next.tenant.phone, nextMessage.text);
    } catch (error) {
      nextError =
        error instanceof Error ? error.message : "The next reminder could not be prepared.";
    }
  }
  const first = next ? firstName(next.tenant.name) : "";

  return (
    <>
      <PageHeader title="Reminders" backTo="/home" />
      <section className="mb-6 space-y-2">
        <h2 className="text-body font-semibold text-ink">Rent due soon</h2>
        {upcomingDays === 0 ? (
          <p className="text-secondary text-ink-muted">
            Upcoming reminders are off. Turn them on in Settings.
          </p>
        ) : upcoming.length === 0 ? (
          <p className="text-secondary text-ink-muted">
            Nobody owes rent due in the next {upcomingDays} {upcomingDays === 1 ? "day" : "days"}.
          </p>
        ) : (
          <ListCard>
            {upcoming.map((candidate) => {
              const lastEntry = latest.get(`${candidate.tenant.id}:reminder`);
              const when =
                candidate.daysUntilDue === 0
                  ? "due today"
                  : `due ${formatShortDate(candidate.dueDate)}, in ${candidate.daysUntilDue} ${candidate.daysUntilDue === 1 ? "day" : "days"}`;
              return (
                <RemindLateRow
                  key={candidate.tenant.id}
                  candidate={candidate}
                  landlord={landlordData}
                  detail={`Owes ${formatMoney(candidate.balance.balanceCents)}, ${when}`}
                  {...(lastEntry ? { lastEntry } : {})}
                />
              );
            })}
          </ListCard>
        )}
      </section>
      <h2 className="mb-2 text-body font-semibold text-ink">Late</h2>
      {candidates.length === 0 ? (
        <p className="py-6 text-body text-ink">Nobody is late right now.</p>
      ) : (
        <div className="space-y-4">
          {nextError && (
            <p role="alert" className="text-secondary text-ink">
              {nextError}
            </p>
          )}
          {next && nextUrl && (
            <a
              className="text-white inline-flex min-h-12 items-center justify-center rounded-sm bg-brand px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href={nextUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!nextMessage) return;
                void recordMessage
                  .mutateAsync({
                    tenantId: next.tenant.id,
                    kind: "reminder",
                    language: nextMessage.language,
                  })
                  .catch(() => undefined);
              }}
            >
              Remind next: {first}
            </a>
          )}
          {!next && (
            <p className="text-secondary text-ink-muted">
              All late tenants were reminded within the last 3 days.
            </p>
          )}
          <ListCard>
            {sortedCandidates.map((candidate) => {
              const lastEntry = latest.get(`${candidate.tenant.id}:reminder`);
              return (
                <RemindLateRow
                  key={candidate.tenant.id}
                  candidate={candidate}
                  landlord={landlordData}
                  {...(lastEntry ? { lastEntry } : {})}
                />
              );
            })}
          </ListCard>
        </div>
      )}
    </>
  );
}
