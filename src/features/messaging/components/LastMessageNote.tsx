import { formatShortDate } from "@/lib/dates";
import type { MessageKind, MessageLogEntry } from "@/types/domain";

const labels: Record<MessageKind, string> = {
  welcome: "Welcome message",
  reminder: "Reminder",
  receipt: "Receipt",
};

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

export function LastMessageNote({
  entry,
  today,
}: {
  entry: MessageLogEntry | undefined;
  today: string;
}) {
  if (!entry) return null;
  const opened = dateInSA(entry.created_at);
  const when = opened === today ? "today" : formatShortDate(opened, today);
  return (
    <p className="text-secondary text-ink-muted">
      Last {labels[entry.kind].toLowerCase()} opened {when}
    </p>
  );
}
