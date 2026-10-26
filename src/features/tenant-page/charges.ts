export interface PublicTenantCharge {
  id: string;
  type: "rent" | "electricity" | "water" | "other";
  period: string;
  amountCents: number;
  dueDate: string;
  note: string | null;
}

function sixMonthRange(today: string): { start: string; end: string } {
  const date = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date: ${today}`);
  date.setUTCDate(1);
  const start = new Date(date);
  start.setUTCMonth(start.getUTCMonth() - 5);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return { start: start.toISOString().slice(0, 10), end: date.toISOString().slice(0, 10) };
}

export function lastSixMonthsCharges(
  charges: PublicTenantCharge[],
  today: string,
): PublicTenantCharge[] {
  const { start, end } = sixMonthRange(today);
  return charges
    .filter((charge) => charge.dueDate >= start && charge.dueDate < end)
    .sort(
      (left, right) => right.dueDate.localeCompare(left.dueDate) || right.id.localeCompare(left.id),
    );
}
