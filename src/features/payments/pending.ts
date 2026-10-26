import type { PendingPaymentRow } from "@/types/domain";

export function sortPendingPaymentsOldestFirst(rows: PendingPaymentRow[]): PendingPaymentRow[] {
  return [...rows].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
