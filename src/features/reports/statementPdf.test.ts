import { describe, expect, it } from "vitest";

import { createTenantStatementPdf, paginateRows, statementFileName } from "./statementPdf";
import type { TenantStatementData } from "@/types/domain";

describe("statement PDF helpers", () => {
  it("splits rows into pages while retaining all rows for a repeated-header renderer", () => {
    const pages = paginateRows(["a", "b", "c", "d", "e"], 2);
    expect(pages).toEqual([["a", "b"], ["c", "d"], ["e"]]);
    expect(pages.flat()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns an empty first page when there are no rows", () => {
    expect(paginateRows([], 20)).toEqual([[]]);
  });

  it("rejects invalid pagination sizes", () => {
    expect(() => paginateRows([], 0)).toThrow("Rows per page must be a positive integer.");
  });

  it("sanitizes statement filenames", () => {
    expect(statementFileName("monthly-statement", "2026-10 / Yard")).toBe(
      "monthly-statement-2026-10Yard.pdf",
    );
  });

  it("creates a multi-page tenant PDF with a closing balance", async () => {
    const data: TenantStatementData = {
      generatedOn: "2026-10-12",
      landlordName: "Thandi Dlamini",
      landlordPhone: "+27 82 123 4567",
      propertyName: "Dlamini Yard",
      propertyAddress: "Orlando East, Soweto",
      tenantName: "Ava Ndlovu",
      roomName: "Room 1",
      lines: Array.from({ length: 70 }, (_, index) => ({
        id: `charge-${index}`,
        kind: "charge" as const,
        date: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
        description: "Rent, October 2026",
        note: null,
        amountCents: 120_000,
        runningBalanceCents: (index + 1) * 120_000,
        isPending: false,
        isVoided: false,
      })),
      closingBalanceCents: 8_400_000,
    };
    const pdf = await createTenantStatementPdf(data);
    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(0);
  });
});
