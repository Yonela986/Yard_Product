import { describe, expect, it } from "vitest";

import type { Landlord, Payment, Property, Room, StatementLine, Tenant } from "@/types/domain";

import { buildReceiptData, createReceiptPdf, receiptFileName } from "./receipt";

const payment: Payment = {
  id: "payment-1",
  tenant_id: "tenant-1",
  amount_cents: 60_000,
  paid_on: "2026-10-10",
  method: "eft",
  proof_url: null,
  status: "confirmed",
  receipt_number: "YD-00012",
  created_by: "landlord",
  created_at: "2026-10-10T22:30:00.000Z",
  voided_at: null,
  void_reason: null,
  decline_reason: null,
};

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
  created_at: "2026-01-01T00:00:00.000Z",
};

const room: Room = {
  id: "room-1",
  property_id: "property-1",
  name: "Room 2",
  monthly_rent_cents: 120_000,
  due_day: 1,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

const property: Property = {
  id: "property-1",
  landlord_id: "landlord-1",
  name: "Ndlovu Yard",
  address: "12 Main Road",
  bank_details: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const landlord: Landlord = {
  id: "landlord-1",
  name: "Thandi Ndlovu",
  phone: "+27821234567",
  language: "en",
  reminder_tone: "friendly",
    upcoming_reminder_days: 3,
  onboarding_completed_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
};

const statement: StatementLine[] = [
  {
    id: payment.id,
    kind: "payment",
    date: payment.paid_on,
    description: "Payment, EFT · Receipt YD-00012",
    note: null,
    amountCents: -payment.amount_cents,
    runningBalanceCents: 60_000,
    isPending: false,
    isVoided: false,
  },
];

describe("buildReceiptData", () => {
  it("combines the receipt fields with the balance from its statement line", () => {
    expect(buildReceiptData(payment, tenant, room, property, landlord, statement)).toEqual({
      receiptNumber: "YD-00012",
      issuedOn: "2026-10-11",
      landlordName: "Thandi Ndlovu",
      landlordPhone: "082 123 4567",
      propertyName: "Ndlovu Yard",
      propertyAddress: "12 Main Road",
      tenantName: "Ava Ndlovu",
      roomName: "Room 2",
      amountCents: 60_000,
      paidOn: "2026-10-10",
      method: "eft",
      balanceAfterCents: 60_000,
    });
  });

  it("requires a receipt number and matching statement entry", () => {
    expect(() =>
      buildReceiptData(
        { ...payment, receipt_number: null },
        tenant,
        room,
        property,
        landlord,
        statement,
      ),
    ).toThrow();
    expect(() => buildReceiptData(payment, tenant, room, property, landlord, [])).toThrow();
  });
});

describe("receiptFileName", () => {
  it("creates the specified receipt filename", () => {
    expect(receiptFileName("YD-00012")).toBe("receipt-YD-00012.pdf");
    expect(receiptFileName("YD/12")).toBe("receipt-YD12.pdf");
  });
});

describe("createReceiptPdf", () => {
  it("returns a PDF blob when given plain receipt data", async () => {
    const data = buildReceiptData(payment, tenant, room, property, landlord, statement);
    const blob = await createReceiptPdf(data);

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
