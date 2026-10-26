import { describe, expect, it } from "vitest";

import type { Payment, Room, Tenant, TenantBalance } from "@/types/domain";
import { formatMoney } from "@/lib/money";

import {
  composeReceipt,
  composeReminder,
  composeTenantPaymentNotice,
  composeWelcome,
} from "./compose";

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

function balance(overrides: Partial<TenantBalance> = {}): TenantBalance {
  return {
    tenantId: tenant.id,
    roomId: room.id,
    chargedCents: 120_000,
    paidCents: 60_000,
    balanceCents: 60_000,
    overdueCents: 60_000,
    paidThisMonthCents: 60_000,
    oldestUnpaidDueDate: "2026-10-01",
    ...overrides,
  };
}

const payment: Payment = {
  id: "payment-1",
  tenant_id: tenant.id,
  amount_cents: 60_000,
  paid_on: "2026-10-10",
  method: "eft",
  proof_url: null,
  status: "confirmed",
  receipt_number: "YD-00012",
  created_by: "landlord",
  created_at: "2026-10-10T12:00:00Z",
  voided_at: null,
  void_reason: null,
  decline_reason: null,
};

describe("composeWelcome", () => {
  it("uses the saved language by default, first name, and the private tenant link", () => {
    const message = composeWelcome({ ...tenant, language: "zu" }, room);
    expect(message).toMatchObject({ kind: "welcome", language: "zu" });
    expect(message.text).toContain("Sawubona Ava");
    expect(message.text).toContain("/t/private-token");
    expect(message.text).not.toMatch(/[{}]/);
  });
});

describe("composeReminder", () => {
  it("uses firm wording and the current amount owed for late tenants", () => {
    const message = composeReminder(tenant, room, balance(), "firm", "2026-10-12");
    expect(message.text).toContain(formatMoney(60_000));
    expect(message.text).toContain("11 days late");
  });

  it("uses the gentle late reminder for Friendly wording", () => {
    const message = composeReminder(tenant, room, balance(), "friendly", "2026-10-12");
    expect(message.text).toContain("gentle reminder");
    expect(message.text).toContain("was due on 1 Oct");
  });

  it("uses the friendly due-date reminder for a balance not yet due", () => {
    const message = composeReminder(
      tenant,
      room,
      balance({
        overdueCents: 0,
        oldestUnpaidDueDate: "2026-11-01",
        paidThisMonthCents: 0,
      }),
      "firm",
      "2026-10-12",
    );
    expect(message.template).toBe("friendlyReminder");
    expect(message.text).toContain("due on 1 Nov");
  });

  it("uses the remaining balance for a part-paid late tenant", () => {
    const message = composeReminder(
      tenant,
      room,
      balance({ balanceCents: 20_000, overdueCents: 20_000 }),
      "firm",
      "2026-10-12",
    );
    expect(message.text).toContain(formatMoney(20_000));
    expect(message.text).not.toContain(formatMoney(room.monthly_rent_cents));
  });
});

describe("composeReceipt", () => {
  it("includes the receipt details and tenant link", () => {
    const message = composeReceipt(tenant, room, payment);
    expect(message.text).toContain(formatMoney(payment.amount_cents));
    expect(message.text).toContain("10 Oct");
    expect(message.text).toContain("YD-00012");
    expect(message.text).toContain("/t/private-token");
  });

  describe("composeTenantPaymentNotice", () => {
    it.each(["en", "zu", "xh", "st"] as const)(
      "renders the %s template for the landlord",
      (language) => {
        const result = composeTenantPaymentNotice(
          {
            tenantName: tenant.name,
            language,
            roomName: room.name,
            landlordName: "Thandi Ndlovu",
          },
          120_000,
          "2026-10-03",
        );
        expect(result.language).toBe(language);
        expect(result.text).not.toMatch(/[{}]/);
        expect(result.text).toContain("Ava");
        expect(result.text).toContain("Room 2");
        expect(result.text).toContain(formatMoney(120_000));
      },
    );
  });

  it("refuses voided payments", () => {
    expect(() =>
      composeReceipt(tenant, room, {
        ...payment,
        status: "declined",
        voided_at: "2026-10-11T10:00:00Z",
      }),
    ).toThrow("confirmed, non-voided");
  });
});
