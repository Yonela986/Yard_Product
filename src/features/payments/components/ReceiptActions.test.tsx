import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReceiptContext } from "./ReceiptActions";
import { ReceiptActions } from "./ReceiptActions";

const context: ReceiptContext = {
  payment: {
    id: "payment-1",
    tenant_id: "tenant-1",
    amount_cents: 60_000,
    paid_on: "2026-10-10",
    method: "eft",
    proof_url: null,
    status: "confirmed",
    receipt_number: "YD-00012",
    created_by: "landlord",
    created_at: "2026-10-10T10:00:00.000Z",
    voided_at: null,
    void_reason: null,
    decline_reason: null,
  },
  tenant: {
    id: "tenant-1",
    room_id: "room-1",
    name: "Ava Ndlovu",
    phone: "+27821234567",
    language: "en",
    move_in_date: "2026-01-01",
    deposit_cents: 0,
    move_out_date: null,
    access_token: "tenant-link-token",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  room: {
    id: "room-1",
    property_id: "property-1",
    name: "Room 2",
    monthly_rent_cents: 120_000,
    due_day: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  property: {
    id: "property-1",
    landlord_id: "landlord-1",
    name: "Ndlovu Yard",
    address: "12 Main Road",
    bank_details: null,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  landlord: {
    id: "landlord-1",
    name: "Thandi Ndlovu",
    phone: "+27821234567",
    language: "en",
    reminder_tone: "friendly",
    upcoming_reminder_days: 3,
    onboarding_completed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  statement: [
    {
      id: "payment-1",
      kind: "payment",
      date: "2026-10-10",
      description: "Payment · EFT",
      note: null,
      amountCents: -60_000,
      runningBalanceCents: 60_000,
      isPending: false,
      isVoided: false,
    },
  ],
};

describe("ReceiptActions", () => {
  it("previews the receipt details before offering PDF actions", () => {
    render(<ReceiptActions context={context} />);

    fireEvent.click(screen.getByRole("button", { name: "View receipt" }));

    expect(screen.getByText("YD-00012")).toBeTruthy();
    expect(screen.getByText("Thandi Ndlovu")).toBeTruthy();
    expect(screen.getByText("Ava Ndlovu")).toBeTruthy();
    expect(screen.getByText("Room 2")).toBeTruthy();
    expect(screen.getByText("Amount received")).toBeTruthy();
    expect(screen.getByText("Date paid")).toBeTruthy();
    expect(screen.getByText("Balance after this payment")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
  });
});
