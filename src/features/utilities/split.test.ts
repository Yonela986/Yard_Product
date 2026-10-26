import { describe, expect, it } from "vitest";

import {
  allocate,
  buildBillPayload,
  buildChargeNote,
  canUndo,
  defaultDueDate,
  fromMilliUnits,
  sortUtilityRooms,
  splitByUsage,
  splitCustom,
  splitEqual,
  toMilliUnits,
  unitsFromReadings,
} from "./split";
import { formatMoney } from "@/lib/money";

const rooms = [
  { roomId: "r2", roomName: "Room 2", tenantId: "t2", tenantName: "B" },
  { roomId: "r10", roomName: "Room 10", tenantId: "t10", tenantName: "C" },
  { roomId: "r1", roomName: "Room 1", tenantId: "t1", tenantName: "A" },
];

describe("utility allocation", () => {
  it("uses largest remainder and natural room order for equal splits", () => {
    const result = splitEqual({ totalCents: 100_000, rooms, includeMainHouse: false });
    expect(result.shares.map(({ room, amountCents }) => [room.roomName, amountCents])).toEqual([
      ["Room 1", 33_334],
      ["Room 2", 33_333],
      ["Room 10", 33_333],
    ]);
  });

  it("allocates R1 000 across three weights exactly", () => {
    expect(allocate(100_000, [1n, 1n, 1n])).toEqual([33_334, 33_333, 33_333]);
  });

  it("breaks equal remainders by input order and keeps zero weights at zero", () => {
    expect(allocate(2, [1n, 1n, 0n])).toEqual([1, 1, 0]);
    expect(allocate(1, [1n, 1n])).toEqual([1, 0]);
  });

  it("allocates very large totals without overflowing intermediate multiplication", () => {
    expect(allocate(2_147_483_647, [1_000_000_000n, 1_000_000_000n])).toEqual([
      1_073_741_824, 1_073_741_823,
    ]);
  });

  it("includes the main house as an equal participant", () => {
    const result = splitEqual({
      totalCents: 180_000,
      rooms: rooms.slice(0, 2),
      includeMainHouse: true,
    });
    expect(result.shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(120_000);
    expect(result.mainHouseCents).toBe(60_000);
  });

  it("splits only the selected rooms and describes equal splits without a main house", () => {
    const result = splitEqual({
      totalCents: 12_000,
      rooms: [rooms[2]!],
      includeMainHouse: false,
    });
    expect(result.shares.map((share) => share.room.roomName)).toEqual(["Room 1"]);
    expect(
      buildChargeNote({
        type: "water",
        period: "2026-10",
        totalCents: 12_000,
        splitMethod: "equal",
        roomCount: 2,
        includesMainHouse: false,
      }),
    ).toBe(
      `Your share of the ${formatMoney(12_000)} water bill for October 2026, split equally between 2 rooms.`,
    );
  });

  it("validates empty equal splits", () => {
    expect(() => splitEqual({ totalCents: 100, rooms: [], includeMainHouse: true })).toThrow(
      "Select at least one occupied room.",
    );
  });

  it("splits by usage, records units, and allocates the main house share", () => {
    const result = splitByUsage({
      totalCents: 90_000,
      rooms: rooms.slice(0, 2),
      includeMainHouse: true,
      readings: [
        { roomId: "r2", previousMilli: 1_000, currentMilli: 3_000 },
        { roomId: "r10", previousMilli: 0, currentMilli: 1_000 },
      ],
      mainHouseUnitsMilli: 1_000,
    });
    expect(result.shares.map((share) => share.unitsMilli)).toEqual([2_000, 1_000]);
    expect(result.shares.map((share) => share.amountCents)).toEqual([45_000, 22_500]);
    expect(result.mainHouseCents).toBe(22_500);
    expect(result.totalUnitsMilli).toBe(4_000);
  });

  it("does not charge zero-usage rooms", () => {
    const result = splitByUsage({
      totalCents: 1_000,
      rooms: rooms.slice(0, 2),
      includeMainHouse: false,
      readings: [
        { roomId: "r2", previousMilli: 1_000, currentMilli: 1_000 },
        { roomId: "r10", previousMilli: 0, currentMilli: 1_000 },
      ],
      mainHouseUnitsMilli: null,
    });
    expect(result.shares.map((share) => share.amountCents)).toEqual([0, 1_000]);
  });

  it("requires non-zero units for at least one participant", () => {
    expect(() =>
      splitByUsage({
        totalCents: 1_000,
        rooms: rooms.slice(0, 2),
        includeMainHouse: false,
        readings: [
          { roomId: "r2", previousMilli: 1_000, currentMilli: 1_000 },
          { roomId: "r10", previousMilli: 500, currentMilli: 500 },
        ],
        mainHouseUnitsMilli: null,
      }),
    ).toThrow("Enter units for at least one room or the main house.");
  });

  it("validates custom amounts and puts the remainder with the landlord", () => {
    const result = splitCustom({
      totalCents: 100_000,
      rooms: rooms.slice(0, 2),
      includeMainHouse: false,
      amountsByRoom: { r2: 20_000, r10: 30_000 },
    });
    expect(result.mainHouseCents).toBe(50_000);
    expect(() =>
      splitCustom({
        totalCents: 100,
        rooms: rooms.slice(0, 2),
        includeMainHouse: false,
        amountsByRoom: { r2: 80, r10: 30 },
      }),
    ).toThrow("Room amounts cannot exceed the bill total.");
  });

  it("parses and formats decimal units without floating point", () => {
    expect(toMilliUnits("12,5")).toBe(12_500);
    expect(toMilliUnits("12.5")).toBe(12_500);
    expect(toMilliUnits("0.001")).toBe(1);
    expect(fromMilliUnits(12_500)).toBe("12.5");
    expect(fromMilliUnits(12_001)).toBe("12.001");
  });

  it("rejects decreasing readings", () => {
    expect(unitsFromReadings(12_000, 13_500)).toBe(1_500);
    expect(() => unitsFromReadings(13_500, 12_000)).toThrow(
      "Current reading cannot be lower than the previous reading.",
    );
  });

  it("builds human-readable notes for all split methods", () => {
    expect(
      buildChargeNote({
        type: "electricity",
        period: "2026-10",
        totalCents: 180_000,
        splitMethod: "equal",
        roomCount: 4,
        includesMainHouse: true,
      }),
    ).toBe(
      `Your share of the ${formatMoney(180_000)} electricity bill for October 2026, split equally between 4 rooms and the main house.`,
    );
    expect(
      buildChargeNote({
        type: "water",
        period: "2026-10",
        totalCents: 90_000,
        splitMethod: "by_room",
        roomCount: 2,
        includesMainHouse: false,
        unitsMilli: 120_000,
        totalUnitsMilli: 400_000,
      }),
    ).toBe(
      `Your share of the ${formatMoney(90_000)} water bill for October 2026, based on units used: 120 of 400 kL.`,
    );
    expect(
      buildChargeNote({
        type: "electricity",
        period: "2026-10",
        totalCents: 180_000,
        splitMethod: "custom",
        roomCount: 4,
        includesMainHouse: false,
      }),
    ).toBe(
      `Your share of the ${formatMoney(180_000)} electricity bill for October 2026, set by your landlord.`,
    );
  });

  it("builds a consistent create-bill payload", () => {
    const split = splitEqual({
      totalCents: 100_000,
      rooms: rooms.slice(0, 2),
      includeMainHouse: true,
    });
    const payload = buildBillPayload({
      bill: {
        propertyId: "property",
        type: "electricity",
        period: "2026-10",
        totalCents: 100_000,
        splitMethod: "equal",
        dueDate: "2026-10-19",
        includesMainHouse: true,
        note: null,
      },
      split,
      splitMethod: "equal",
    });
    const sharesCents = payload.p_shares.reduce(
      (sum, share) => sum + Number(share["amount_cents"]),
      0,
    );
    expect(sharesCents + payload.p_main_house_cents).toBe(100_000);
  });

  it("allows undo through day 14, but not on day 15", () => {
    const created = Date.parse("2026-10-01T00:00:00Z");
    const day = 24 * 60 * 60 * 1000;
    expect(canUndo(new Date(created).toISOString(), created + 13 * day)).toBe(true);
    expect(canUndo(new Date(created).toISOString(), created + 14 * day)).toBe(true);
    expect(canUndo(new Date(created).toISOString(), created + 15 * day)).toBe(false);
  });

  it("defaults due dates to seven days after the South African date", () => {
    expect(defaultDueDate("2026-10-12")).toBe("2026-10-19");
    expect(defaultDueDate("2026-12-28")).toBe("2027-01-04");
  });

  it("sorts rooms in natural order", () => {
    expect(sortUtilityRooms(rooms).map((room) => room.roomName)).toEqual([
      "Room 1",
      "Room 2",
      "Room 10",
    ]);
  });

  it("preserves the total for deterministic varied allocations", () => {
    let seed = 12_345;
    const random = () => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed;
    };
    for (let iteration = 0; iteration < 500; iteration += 1) {
      const count = (random() % 12) + 1;
      const weights = Array.from({ length: count }, () => BigInt((random() % 10_000) + 1));
      const total = random() % 2_147_483_647;
      expect(allocate(total, weights).reduce((sum, amount) => sum + amount, 0)).toBe(total);
    }
  });
});
