import { describe, expect, it } from "vitest";

import { emptyUtilityBill, utilityBillSchema } from "./schema";

function values() {
  return {
    ...emptyUtilityBill("2026-10-19", "2026-09"),
    total: "1 800",
    includedRoomIds: ["room-1"],
  };
}

describe("utility bill form validation", () => {
  it("accepts a valid basic bill", () => {
    expect(utilityBillSchema.safeParse(values()).success).toBe(true);
  });

  it("requires at least one occupied room", () => {
    expect(utilityBillSchema.safeParse({ ...values(), includedRoomIds: [] }).success).toBe(false);
  });

  it("rejects decreasing and missing meter readings", () => {
    expect(
      utilityBillSchema.safeParse({
        ...values(),
        splitMethod: "by_room",
        previousReadings: { "room-1": "12.5" },
        currentReadings: { "room-1": "12" },
      }).success,
    ).toBe(false);
    expect(
      utilityBillSchema.safeParse({
        ...values(),
        splitMethod: "by_room",
        previousReadings: {},
        currentReadings: {},
      }).success,
    ).toBe(false);
  });

  it("blocks custom allocations above the bill total", () => {
    expect(
      utilityBillSchema.safeParse({
        ...values(),
        splitMethod: "custom",
        customAmounts: { "room-1": "1 800.01" },
      }).success,
    ).toBe(false);
  });
});
