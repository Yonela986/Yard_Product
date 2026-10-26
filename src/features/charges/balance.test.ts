import { describe, expect, it } from "vitest";

import type { Charge, Payment, TenantBalance } from "@/types/domain";

import {
  buildStatement,
  daysLate,
  deriveStatus,
  groupTenantsByStatus,
  summariseMonth,
} from "./balance";

function balance(values: Partial<TenantBalance> = {}): TenantBalance {
  return {
    tenantId: "tenant-1",
    roomId: "room-1",
    chargedCents: 0,
    paidCents: 0,
    balanceCents: 0,
    overdueCents: 0,
    paidThisMonthCents: 0,
    oldestUnpaidDueDate: null,
    ...values,
  };
}

function charge(values: Partial<Charge> = {}): Charge {
  return {
    id: "charge-1",
    tenant_id: "tenant-1",
    type: "rent",
    period: "2026-10",
    amount_cents: 120_000,
    due_date: "2026-10-05",
    note: null,
    created_at: "2026-10-01T00:00:00.000Z",
    utility_bill_id: null,
    ...values,
  };
}

function payment(values: Partial<Payment> = {}): Payment {
  return {
    id: "payment-1",
    tenant_id: "tenant-1",
    amount_cents: 20_000,
    paid_on: "2026-10-06",
    method: "cash",
    proof_url: null,
    status: "confirmed",
    receipt_number: null,
    created_by: "landlord",
    created_at: "2026-10-06T12:00:00.000Z",
    voided_at: null,
    void_reason: null,
    decline_reason: null,
    ...values,
  };
}

describe("deriveStatus", () => {
  it("marks a tenant without charges as paid", () => {
    expect(deriveStatus(balance())).toBe("paid");
  });

  it("marks exact payment and overpayment as paid", () => {
    expect(deriveStatus(balance({ balanceCents: 0 }))).toBe("paid");
    expect(deriveStatus(balance({ balanceCents: -20_000 }))).toBe("paid");
  });

  it("marks overdue charges as late before considering partial payment", () => {
    expect(deriveStatus(balance({ balanceCents: 100_000, overdueCents: 100_000 }))).toBe("late");
    expect(
      deriveStatus(
        balance({ balanceCents: 100_000, overdueCents: 80_000, paidThisMonthCents: 20_000 }),
      ),
    ).toBe("late");
  });

  it("marks not-late current-month partial payments as part paid", () => {
    expect(deriveStatus(balance({ balanceCents: 100_000, paidThisMonthCents: 20_000 }))).toBe(
      "part_paid",
    );
  });

  it("marks an unpaid balance without overdue charges or this-month payment as not due", () => {
    expect(deriveStatus(balance({ balanceCents: 120_000 }))).toBe("not_due");
  });

  it("does not treat payments from last month as part paid", () => {
    expect(deriveStatus(balance({ balanceCents: 120_000, overdueCents: 0 }))).toBe("not_due");
  });
});

describe("daysLate", () => {
  it("returns calendar days after the due date and zero for a due or future date", () => {
    expect(daysLate("2026-10-01", "2026-10-13")).toBe(12);
    expect(daysLate("2026-10-13", "2026-10-13")).toBe(0);
    expect(daysLate("2026-10-14", "2026-10-13")).toBe(0);
    expect(daysLate(null, "2026-10-13")).toBe(0);
  });
});

describe("buildStatement", () => {
  it("returns newest first, orders same-day charges before payments, and maintains running balance", () => {
    const lines = buildStatement(
      [
        charge({ id: "oct", period: "2026-10", due_date: "2026-10-05", amount_cents: 100_000 }),
        charge({ id: "nov", period: "2026-11", due_date: "2026-11-05", amount_cents: 100_000 }),
      ],
      [payment({ id: "paid-oct", paid_on: "2026-10-05", amount_cents: 20_000 })],
    );

    expect(lines.map((line) => line.id)).toEqual(["nov", "paid-oct", "oct"]);
    expect(lines.map((line) => line.runningBalanceCents)).toEqual([180_000, 80_000, 100_000]);
    expect(lines[1]?.description).toBe("Payment, Cash");
    expect(lines[2]?.description).toBe("Rent, October 2026");
  });

  it("shows pending payments without changing the balance and ignores declined payments", () => {
    const lines = buildStatement(
      [charge({ amount_cents: 100_000 })],
      [
        payment({ id: "pending", status: "pending_confirmation", amount_cents: 30_000 }),
        payment({ id: "declined", status: "declined", amount_cents: 40_000 }),
      ],
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      id: "pending",
      isPending: true,
      runningBalanceCents: 100_000,
    });
    expect(lines[1]).toMatchObject({ id: "charge-1", runningBalanceCents: 100_000 });
  });

  it("shows a voided payment as a dated reversal and hides a rejected claim", () => {
    const lines = buildStatement(
      [charge({ amount_cents: 100_000 })],
      [
        payment({
          id: "voided",
          amount_cents: 30_000,
          status: "declined",
          receipt_number: "YD-00001",
          voided_at: "2026-10-08T22:30:00.000Z",
          void_reason: "Entered twice",
        }),
        payment({ id: "rejected-claim", status: "declined" }),
      ],
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      id: "voided",
      date: "2026-10-09",
      description: "Voided payment · Receipt YD-00001",
      note: "Entered twice",
      amountCents: 30_000,
      runningBalanceCents: 130_000,
      isVoided: true,
    });
  });

  it("returns no lines when there are no charges or payments", () => {
    expect(buildStatement([], [])).toEqual([]);
  });

  it("labels utility charges with the bill type and period and retains the explanation", () => {
    const lines = buildStatement(
      [
        charge({
          type: "electricity",
          period: "2026-10",
          note: "Your share of the R1 800 electricity bill for October 2026.",
        }),
      ],
      [],
    );
    expect(lines[0]).toMatchObject({
      description: "Electricity, October 2026",
      note: "Your share of the R1 800 electricity bill for October 2026.",
    });
  });
});

describe("summariseMonth", () => {
  it("summarises confirmed current-month payments, charges due this month and positive current balances", () => {
    expect(
      summariseMonth(
        "2026-10",
        [
          charge({ id: "oct", amount_cents: 120_000 }),
          charge({
            id: "last-month-utility",
            type: "water",
            period: "2026-09",
            due_date: "2026-10-12",
            amount_cents: 50_000,
          }),
          charge({
            id: "nov",
            period: "2026-11",
            due_date: "2026-11-05",
            amount_cents: 60_000,
          }),
        ],
        [
          payment({ id: "oct-payment", amount_cents: 20_000 }),
          payment({ id: "old-payment", paid_on: "2026-09-30", amount_cents: 80_000 }),
          payment({ id: "pending", status: "pending_confirmation", amount_cents: 10_000 }),
        ],
        [
          balance({ balanceCents: 100_000 }),
          balance({ tenantId: "tenant-2", balanceCents: -20_000 }),
        ],
      ),
    ).toEqual({ collectedCents: 20_000, expectedCents: 170_000, outstandingCents: 100_000 });
  });
});

describe("groupTenantsByStatus", () => {
  it("returns non-empty groups in severity order and sorts late by days then names", () => {
    const groups = groupTenantsByStatus([
      {
        tenantId: "p",
        name: "Zoe",
        roomName: "Room 1",
        balanceCents: 10,
        paidCents: 0,
        overdueCents: 0,
        paidThisMonthCents: 0,
        oldestUnpaidDueDate: null,
        status: "not_due",
        daysLate: 0,
      },
      {
        tenantId: "l2",
        name: "Mia",
        roomName: "Room 2",
        balanceCents: 10,
        paidCents: 0,
        overdueCents: 10,
        paidThisMonthCents: 0,
        oldestUnpaidDueDate: null,
        status: "late",
        daysLate: 4,
      },
      {
        tenantId: "paid",
        name: "Adam",
        roomName: "Room 3",
        balanceCents: 0,
        paidCents: 10,
        overdueCents: 0,
        paidThisMonthCents: 10,
        oldestUnpaidDueDate: null,
        status: "paid",
        daysLate: 0,
      },
      {
        tenantId: "l1",
        name: "Nia",
        roomName: "Room 4",
        balanceCents: 10,
        paidCents: 0,
        overdueCents: 10,
        paidThisMonthCents: 0,
        oldestUnpaidDueDate: null,
        status: "late",
        daysLate: 9,
      },
      {
        tenantId: "p2",
        name: "Ava",
        roomName: "Room 5",
        balanceCents: 10,
        paidCents: 1,
        overdueCents: 0,
        paidThisMonthCents: 1,
        oldestUnpaidDueDate: null,
        status: "part_paid",
        daysLate: 0,
      },
    ]);
    expect(groups.map((group) => group.status)).toEqual(["late", "part_paid", "not_due", "paid"]);
    expect(groups[0]?.tenants.map((tenant) => tenant.tenantId)).toEqual(["l1", "l2"]);
    expect(groups[2]?.tenants.map((tenant) => tenant.name)).toEqual(["Zoe"]);
  });
});
