import { describe, expect, it } from "vitest";

import type { PendingPaymentRow } from "@/types/domain";

import { sortPendingPaymentsOldestFirst } from "./pending";

const row = (paymentId: string, createdAt: string): PendingPaymentRow => ({
  paymentId,
  tenantId: "tenant-1",
  tenantName: "Ava Ndlovu",
  roomName: "Room 2",
  amountCents: 120_000,
  paidOn: "2026-10-12",
  method: "eft",
  hasProof: false,
  createdAt,
});

describe("sortPendingPaymentsOldestFirst", () => {
  it("places the oldest notice first without mutating the input", () => {
    const rows = [row("new", "2026-10-12T12:00:00Z"), row("old", "2026-10-10T12:00:00Z")];
    expect(sortPendingPaymentsOldestFirst(rows).map((item) => item.paymentId)).toEqual([
      "old",
      "new",
    ]);
    expect(rows[0]?.paymentId).toBe("new");
  });
});
