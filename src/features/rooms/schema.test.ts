import { describe, expect, it } from "vitest";

import {
  bankDetailsSchema,
  hasDuplicateRoomName,
  naturalRoomSort,
  roomFormPayload,
  roomFormSchema,
} from "./schema";

describe("room ordering", () => {
  it("sorts room numbers naturally", () => {
    const sorted = naturalRoomSort([{ name: "Room 10" }, { name: "Room 2" }, { name: "Room 1" }]);
    expect(sorted.map((room) => room.name)).toEqual(["Room 1", "Room 2", "Room 10"]);
  });
});

describe("duplicate room names", () => {
  it("detects duplicates regardless of case and spacing", () => {
    expect(hasDuplicateRoomName(["Room 1", "room 1", "Room 2"])).toBe(true);
    expect(hasDuplicateRoomName(["Room 1", "Room 2", "Room 3"])).toBe(false);
  });
});

describe("room form", () => {
  it("validates and converts rent and due day", () => {
    expect(
      roomFormSchema.safeParse({ name: "Room 1", rent: "1 250,50", dueDay: "28" }).success,
    ).toBe(true);
    expect(roomFormPayload({ name: " Room 1 ", rent: "1 250,50", dueDay: "28" })).toEqual({
      name: "Room 1",
      monthly_rent_cents: 125_050,
      due_day: 28,
    });
  });

  it("rejects invalid rent and due days", () => {
    expect(roomFormSchema.safeParse({ name: "Room 1", rent: "0", dueDay: "1" }).success).toBe(
      false,
    );
    expect(roomFormSchema.safeParse({ name: "Room 1", rent: "100", dueDay: "29" }).success).toBe(
      false,
    );
  });

  describe("bank details", () => {
    it("allows up to 500 characters and rejects longer instructions", () => {
      expect(bankDetailsSchema.safeParse("x".repeat(500)).success).toBe(true);
      expect(bankDetailsSchema.safeParse("x".repeat(501)).success).toBe(false);
    });
  });
});
