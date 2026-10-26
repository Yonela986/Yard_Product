import { describe, expect, it } from "vitest";

import { lastSixMonthsCharges } from "./charges";

describe("lastSixMonthsCharges", () => {
  it("returns charges due in the current and previous five months, newest first", () => {
    const charges = [
      {
        id: "older",
        type: "rent" as const,
        period: "2026-04",
        amountCents: 1,
        dueDate: "2026-04-30",
        note: null,
      },
      {
        id: "current",
        type: "water" as const,
        period: "2026-10",
        amountCents: 2,
        dueDate: "2026-10-12",
        note: null,
      },
      {
        id: "lower",
        type: "electricity" as const,
        period: "2026-05",
        amountCents: 3,
        dueDate: "2026-05-01",
        note: null,
      },
    ];
    expect(lastSixMonthsCharges(charges, "2026-10-12").map((charge) => charge.id)).toEqual([
      "current",
      "lower",
    ]);
  });
});
