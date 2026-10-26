import { describe, expect, it } from "vitest";

import type { MessageLogEntry, Room, Tenant, TenantBalance } from "@/types/domain";

import { latestMessageByTenantKind, selectNextReminder, wasRemindedWithinDays } from "./reminders";

const now = new Date("2026-10-12T08:00:00+02:00");

const tenant: Tenant = {
  id: "tenant-1",
  room_id: "room-1",
  name: "Ava Ndlovu",
  phone: "+27821234567",
  language: "en",
  move_in_date: "2026-01-01",
  deposit_cents: 0,
  move_out_date: null,
  access_token: "private-token",
  created_at: "2026-01-01T00:00:00Z",
};

const room: Room = {
  id: "room-1",
  property_id: "property-1",
  name: "Room 2",
  monthly_rent_cents: 120_000,
  due_day: 1,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const balance: TenantBalance = {
  tenantId: tenant.id,
  roomId: room.id,
  chargedCents: 120_000,
  paidCents: 0,
  balanceCents: 120_000,
  overdueCents: 120_000,
  paidThisMonthCents: 0,
  oldestUnpaidDueDate: "2026-10-01",
};

function log(createdAt: string, kind: MessageLogEntry["kind"] = "reminder"): MessageLogEntry {
  return {
    id: createdAt,
    tenant_id: "tenant-1",
    kind,
    payment_id: null,
    language: "en",
    created_at: createdAt,
  };
}

describe("message log helpers", () => {
  it("keeps the latest entry per tenant and kind", () => {
    const latest = latestMessageByTenantKind([
      log("2026-10-10T12:00:00Z"),
      log("2026-10-11T12:00:00Z"),
      log("2026-10-11T13:00:00Z", "welcome"),
    ]);
    expect(latest.get("tenant-1:reminder")?.created_at).toBe("2026-10-11T12:00:00Z");
    expect(latest.get("tenant-1:welcome")?.kind).toBe("welcome");
  });

  it("applies the 3-day quiet period", () => {
    expect(wasRemindedWithinDays("2026-10-10T08:00:00+02:00", now)).toBe(true);
    expect(wasRemindedWithinDays("2026-10-09T07:59:59+02:00", now)).toBe(false);
    expect(wasRemindedWithinDays(null, now)).toBe(false);
  });

  it("selects the longest overdue eligible tenant and excludes recently reminded tenants", () => {
    const candidate = (name: string, days: number, lastReminderAt: string | null) => ({
      tenant: { ...tenant, name },
      room,
      balance,
      daysLate: days,
      lastReminderAt,
    });
    expect(
      selectNextReminder(
        [
          candidate("Recently reminded", 30, "2026-10-11T12:00:00+02:00"),
          candidate("Next", 12, null),
          candidate("Most overdue", 20, null),
        ],
        now,
      )?.tenant.name,
    ).toBe("Most overdue");
    expect(
      selectNextReminder([candidate("Recently reminded", 3, "2026-10-11T12:00:00+02:00")], now),
    ).toBeNull();
  });
});
