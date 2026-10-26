import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MonthlyStatementData, TenantStatementData } from "@/types/domain";

import { DownloadStatementButton } from "./DownloadStatementButton";

const tenantData: TenantStatementData = {
  generatedOn: "2026-10-15",
  landlordName: "Thandi Ndlovu",
  landlordPhone: "082 123 4567",
  propertyName: "Ndlovu Yard",
  propertyAddress: null,
  tenantName: "Ava Ndlovu",
  roomName: "Room 2",
  lines: [
    {
      id: "charge-1",
      kind: "charge",
      date: "2026-10-01",
      description: "October rent",
      note: null,
      amountCents: 120_000,
      runningBalanceCents: 120_000,
      isPending: false,
      isVoided: false,
    },
  ],
  closingBalanceCents: 120_000,
};

const monthlyData: MonthlyStatementData = {
  generatedOn: "2026-10-15",
  landlordName: "Thandi Ndlovu",
  propertyName: "Ndlovu Yard",
  propertyAddress: null,
  month: "2026-10",
  detail: {
    month: "2026-10",
    chargedByType: { rent: 120_000, electricity: 0, water: 0, other: 0 },
    receivedByMethod: { cash: 0, eft: 60_000, ewallet: 0, other: 0 },
    payments: [],
  },
  outstanding: [],
};

describe("DownloadStatementButton", () => {
  it("previews a tenant ledger before offering PDF actions", () => {
    render(
      <DownloadStatementButton
        kind="tenant"
        data={tenantData}
        fileSuffix="Ava Ndlovu"
        label="View statement"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View statement" }));

    expect(screen.getByRole("heading", { name: "Tenant statement" })).toBeTruthy();
    expect(screen.getByText("October rent")).toBeTruthy();
    expect(screen.getByText("Closing balance")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
  });

  it("previews a monthly summary before offering PDF actions", () => {
    render(
      <DownloadStatementButton
        kind="monthly"
        data={monthlyData}
        fileSuffix="2026-10"
        label="View statement"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View statement" }));

    expect(screen.getByRole("heading", { name: "Monthly statement" })).toBeTruthy();
    expect(screen.getByText("Charged by type")).toBeTruthy();
    expect(screen.getByText("Received by method")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
  });
});
