import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { TenantStatusGroup } from "@/features/charges/balance";

import { HomeQuickActions, HomeSetupSteps, HomeTenantGroups } from "./HomeSections";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      className,
      children,
    }: {
      to: string;
      className?: string;
      children: ReactNode;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

const groups: TenantStatusGroup[] = [
  {
    status: "late",
    tenants: [
      {
        tenantId: "late-1",
        name: "Ava Ndlovu",
        roomName: "Room 1",
        balanceCents: 120_000,
        paidCents: 0,
        overdueCents: 120_000,
        paidThisMonthCents: 0,
        oldestUnpaidDueDate: "2026-10-01",
        status: "late",
        daysLate: 7,
      },
    ],
  },
  {
    status: "paid",
    tenants: [
      {
        tenantId: "paid-1",
        name: "Busi Mokoena",
        roomName: "Room 2",
        balanceCents: 0,
        paidCents: 120_000,
        overdueCents: 0,
        paidThisMonthCents: 120_000,
        oldestUnpaidDueDate: null,
        status: "paid",
        daysLate: 0,
      },
    ],
  },
];

describe("HomeSections", () => {
  it("disables the Remind late tile when there are no late tenants", () => {
    render(<HomeQuickActions hasLateTenants={false} onRecordPayment={() => undefined} />);
    expect(screen.getByRole("button", { name: /Remind late/ })).toHaveProperty("disabled", true);
  });

  it("renders setup steps in order", () => {
    render(<HomeSetupSteps roomsAdded tenantsAdded={false} paymentsRecorded={false} />);
    expect(screen.getByText("Add rooms")).toBeTruthy();
    expect(screen.getByText("Add tenants")).toBeTruthy();
    expect(screen.getByText("Record a payment")).toBeTruthy();
    expect(screen.getByText("Rooms are ready.")).toBeTruthy();
  });

  it("shows status groups and keeps the Paid group folded until opened", () => {
    const onTenantClick = vi.fn();
    render(
      <HomeTenantGroups
        groups={groups}
        currentPeriodCharges={new Map([["late-1", 120_000]])}
        onTenantClick={onTenantClick}
      />,
    );

    expect(screen.getAllByText("Late")).toHaveLength(2);
    const paidDetails = screen.getByText("Paid (1)").closest("details");
    expect(paidDetails?.open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Ava Ndlovu, Room 1/ }));
    expect(onTenantClick).toHaveBeenCalledWith("late-1");
  });

  it("has no axe accessibility violations in dashboard sections", async () => {
    const { container } = render(
      <>
        <HomeQuickActions hasLateTenants={false} onRecordPayment={() => undefined} />
        <HomeSetupSteps roomsAdded tenantsAdded paymentsRecorded />
        <HomeTenantGroups
          groups={groups}
          currentPeriodCharges={new Map()}
          onTenantClick={() => undefined}
        />
      </>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
