import { describe, expect, it } from "vitest";

import {
  buildMonthDetail,
  buildMonthlyIncomeRows,
  buildOutstandingRows,
  buildTenantStatementLines,
  previousMonths,
  sumChargedByType,
  sumReceivedByMethod,
} from "./aggregate";
import type { Charge, Payment, Room, Tenant, TenantBalance } from "@/types/domain";

const charge = (overrides: Partial<Charge> = {}): Charge =>
  ({
    id: "charge-1",
    tenant_id: "tenant-1",
    type: "rent",
    period: "2026-10",
    amount_cents: 120_000,
    due_date: "2026-10-01",
    note: null,
    utility_bill_id: null,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  }) as Charge;

const payment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: "payment-1",
    tenant_id: "tenant-1",
    amount_cents: 50_000,
    paid_on: "2026-10-31",
    method: "cash",
    status: "confirmed",
    created_by: "landlord",
    receipt_number: "YD-1",
    proof_url: null,
    voided_at: null,
    void_reason: null,
    created_at: "2026-10-31T10:00:00Z",
    ...overrides,
  }) as Payment;

const tenant = (overrides: Partial<Tenant> = {}): Tenant =>
  ({
    id: "tenant-1",
    room_id: "room-1",
    name: "Ava Ndlovu",
    phone: "+27821234567",
    language: "en",
    move_in_date: "2026-01-01",
    move_out_date: null,
    deposit_cents: 0,
    access_token: "token",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }) as Tenant;

const room = (overrides: Partial<Room> = {}): Room =>
  ({
    id: "room-1",
    property_id: "property-1",
    name: "Room 1",
    monthly_rent_cents: 120_000,
    due_day: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }) as Room;

describe("income report aggregates", () => {
  it("builds the newest twelve months across year boundaries", () => {
    expect(previousMonths("2026-01")).toEqual([
      "2026-01",
      "2025-12",
      "2025-11",
      "2025-10",
      "2025-09",
      "2025-08",
      "2025-07",
      "2025-06",
      "2025-05",
      "2025-04",
      "2025-03",
      "2025-02",
    ]);
  });

  it("uses charge due dates and confirmed payment dates at month boundaries", () => {
    const rows = buildMonthlyIncomeRows(
      "2026-11",
      [
        charge({ due_date: "2026-10-31", amount_cents: 10 }),
        charge({ due_date: "2026-11-01", amount_cents: 20 }),
      ],
      [
        payment({ paid_on: "2026-10-31", amount_cents: 30 }),
        payment({ id: "first", paid_on: "2026-11-01", amount_cents: 40 }),
        payment({ id: "voided", status: "declined", paid_on: "2026-10-01" }),
        payment({ id: "pending", status: "pending_confirmation", paid_on: "2026-10-01" }),
      ],
      2,
    );
    expect(rows).toEqual([
      { month: "2026-11", chargedCents: 20, receivedCents: 40 },
      { month: "2026-10", chargedCents: 10, receivedCents: 30 },
    ]);
  });

  it("splits a month by charge type and confirmed payment method", () => {
    const detail = buildMonthDetail(
      "2026-10",
      [
        charge({ type: "rent", amount_cents: 100 }),
        charge({ id: "water", type: "water", amount_cents: 25 }),
      ],
      [
        payment({ amount_cents: 30, method: "cash" }),
        payment({ id: "eft", amount_cents: 70, method: "eft" }),
        payment({
          id: "voided",
          amount_cents: 500,
          status: "declined",
          voided_at: "2026-10-05T00:00:00Z",
        }),
      ],
      [tenant()],
      [room()],
    );
    expect(detail.chargedByType).toEqual({ rent: 100, electricity: 0, water: 25, other: 0 });
    expect(detail.receivedByMethod).toEqual({ cash: 30, eft: 70, ewallet: 0, other: 0 });
    expect(sumChargedByType(detail)).toBe(125);
    expect(sumReceivedByMethod(detail)).toBe(100);
  });

  it("sorts positive balances and marks late and moved-out tenants", () => {
    const rows = buildOutstandingRows(
      [
        {
          tenantId: "tenant-1",
          roomId: "room-1",
          balanceCents: 500,
          overdueCents: 500,
          oldestUnpaidDueDate: "2026-10-01",
          chargedCents: 500,
          paidCents: 0,
          paidThisMonthCents: 0,
        },
        {
          tenantId: "tenant-2",
          roomId: "room-2",
          balanceCents: 900,
          overdueCents: 0,
          oldestUnpaidDueDate: null,
          chargedCents: 900,
          paidCents: 0,
          paidThisMonthCents: 0,
        },
        {
          tenantId: "tenant-3",
          roomId: "room-3",
          balanceCents: 0,
          overdueCents: 0,
          oldestUnpaidDueDate: null,
          chargedCents: 0,
          paidCents: 0,
          paidThisMonthCents: 0,
        },
      ] satisfies TenantBalance[],
      [
        tenant({ id: "tenant-1", name: "Late" }),
        tenant({ id: "tenant-2", room_id: "room-2", name: "Moved", move_out_date: "2026-09-01" }),
        tenant({ id: "tenant-3", room_id: "room-3", name: "Clear" }),
      ],
      [room(), room({ id: "room-2", name: "Room 2" }), room({ id: "room-3", name: "Room 3" })],
      "2026-10-12",
    );
    expect(rows.map((row) => [row.tenantName, row.isCurrent, row.daysLate])).toEqual([
      ["Moved", false, null],
      ["Late", true, 11],
    ]);
  });

  it("keeps tenant statement lines oldest first and excludes pending and voided payments", () => {
    const lines = buildTenantStatementLines(
      [charge({ id: "charge-a", due_date: "2026-10-01", amount_cents: 100 })],
      [
        payment({ id: "confirmed", amount_cents: 25, paid_on: "2026-10-05" }),
        payment({
          id: "pending",
          amount_cents: 50,
          status: "pending_confirmation",
          paid_on: "2026-10-06",
        }),
        payment({
          id: "voided",
          amount_cents: 20,
          status: "declined",
          voided_at: "2026-10-07T00:00:00Z",
        }),
      ],
    );
    expect(lines.map((line) => line.kind)).toEqual(["charge", "payment"]);
    expect(lines.at(-1)?.runningBalanceCents).toBe(75);
  });
});
