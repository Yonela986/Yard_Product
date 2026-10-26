import { describe, expect, it } from "vitest";

import type { MessageLogEntry, Room, Tenant, TenantBalance } from "@/types/domain";

import { buildUpcomingReminderCandidates, daysBetween } from "./reminders";

const tenant: Tenant = {
  id: "t1",
  room_id: "r1",
  name: "Ava Ndlovu",
  phone: "+27821234567",
  language: "en",
  move_in_date: "2026-01-01",
  deposit_cents: 0,
  move_out_date: null,
  access_token: "tok",
  created_at: "2026-01-01T00:00:00Z",
};
const room: Room = {
  id: "r1",
  property_id: "p1",
  name: "Room 2",
  monthly_rent_cents: 120_000,
  due_day: 18,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};
const owing = (due: string, overdue = 0): TenantBalance => ({
  tenantId: "t1",
  roomId: "r1",
  chargedCents: 120_000,
  paidCents: 0,
  balanceCents: 120_000,
  overdueCents: overdue,
  paidThisMonthCents: 0,
  oldestUnpaidDueDate: due,
});
const build = (b: TenantBalance, days: number, log: MessageLogEntry[] = []) =>
  buildUpcomingReminderCandidates([tenant], [room], [b], log, "2026-10-13", days);

describe("upcoming rent reminders", () => {
  it("counts days across month ends", () => {
    expect(daysBetween("2026-10-13", "2026-10-18")).toBe(5);
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("lists a tenant whose rent is due exactly 5 days away with a 5-day setting", () => {
    expect(build(owing("2026-10-18"), 5)[0]?.daysUntilDue).toBe(5);
  });

  it("does not list a tenant due 6 days away with a 5-day setting", () => {
    expect(build(owing("2026-10-19"), 5)).toHaveLength(0);
  });

  it("lists nobody when the setting is off", () => {
    expect(build(owing("2026-10-14"), 0)).toHaveLength(0);
  });

  it("leaves late tenants to the late list", () => {
    expect(build(owing("2026-10-01", 120_000), 7)).toHaveLength(0);
  });

  it("skips tenants who already paid", () => {
    expect(build({ ...owing("2026-10-18"), balanceCents: 0 }, 7)).toHaveLength(0);
  });

  it("skips tenants who moved out", () => {
    const moved = { ...tenant, move_out_date: "2026-10-10" };
    expect(
      buildUpcomingReminderCandidates([moved], [room], [owing("2026-10-18")], [], "2026-10-13", 7),
    ).toHaveLength(0);
  });
});
