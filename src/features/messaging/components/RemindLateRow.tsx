import { useMemo, useState } from "react";

import { InitialsTile } from "@/components/ui/InitialsTile";
import { RowAmount } from "@/components/ui/RowAmount";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatShortDate, todayInSA } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { buildWhatsAppUrl } from "@/features/messaging/whatsapp";
import type { Landlord, MessageLogEntry } from "@/types/domain";

import { composeReminder } from "../compose";
import { useRecordMessageOpened } from "../hooks";
import type { ReminderCandidate } from "../reminders";
import { MessageSheet } from "./MessageSheet";

interface RemindLateRowProps {
  candidate: ReminderCandidate;
  landlord: Landlord;
  lastEntry?: MessageLogEntry;
  /** Replaces the default "days late" line, used for upcoming reminders. */
  detail?: string;
}

function dateInSA(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function RemindLateRow({ candidate, landlord, lastEntry, detail }: RemindLateRowProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const recordMessage = useRecordMessageOpened();
  const latest = lastEntry;
  const when = latest
    ? dateInSA(latest.created_at) === todayInSA()
      ? "Opened today"
      : `Last reminder opened ${formatShortDate(dateInSA(latest.created_at))}`
    : null;
  const link = useMemo(() => {
    try {
      const message = composeReminder(
        candidate.tenant,
        candidate.room,
        candidate.balance,
        landlord.reminder_tone,
        todayInSA(),
      );
      return { href: buildWhatsAppUrl(candidate.tenant.phone, message.text), error: "" };
    } catch (error) {
      return {
        href: "",
        error: error instanceof Error ? error.message : "Message could not be prepared.",
      };
    }
  }, [candidate, landlord.reminder_tone]);
  const { href, error } = link;
  const firstName = candidate.tenant.name.trim().split(/\s+/)[0] ?? candidate.tenant.name;

  return (
    <li className="list-none space-y-3 border-b border-line bg-surface px-4 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <InitialsTile name={candidate.tenant.name} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">{candidate.tenant.name}</p>
          <p className="text-secondary text-ink-muted">{candidate.room.name}</p>
          <p className="mt-1 text-secondary text-ink">
            {detail ??
              `Owes ${formatMoney(candidate.balance.balanceCents)}, ${candidate.daysLate} days late`}
          </p>
          {when && <p className="text-secondary text-ink-muted">{when}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RowAmount cents={candidate.balance.balanceCents} />
          <StatusTag variant={detail ? "not_due" : "late"} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-secondary text-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {href && (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line-strong bg-ground px-3 text-secondary font-semibold text-ink"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const message = composeReminder(
                candidate.tenant,
                candidate.room,
                candidate.balance,
                landlord.reminder_tone,
                todayInSA(),
              );
              void recordMessage
                .mutateAsync({
                  tenantId: candidate.tenant.id,
                  kind: "reminder",
                  language: message.language,
                })
                .catch(() => undefined);
            }}
          >
            Open WhatsApp
          </a>
        )}
        <button
          type="button"
          className="inline-flex min-h-11 items-center px-3 text-secondary font-semibold text-ink underline"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Preview reminder for ${firstName}`}
        >
          Preview
        </button>
      </div>
      <MessageSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        mode={{
          kind: "reminder",
          tenant: candidate.tenant,
          room: candidate.room,
          balance: candidate.balance,
        }}
        landlord={landlord}
      />
    </li>
  );
}
