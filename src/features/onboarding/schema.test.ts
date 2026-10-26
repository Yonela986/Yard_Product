import { describe, expect, it } from "vitest";

import {
  findDuplicateRoomIndexes,
  generateRooms,
  onboardingSchema,
  roomSchema,
  summariseRooms,
  toRoomPayload,
} from "./schema";

describe("roomSchema", () => {
  it("accepts a valid room", () => {
    expect(roomSchema.safeParse({ name: "Room 1", rent: "1 200", dueDay: "1" }).success).toBe(true);
  });
  it("rejects a blank name", () => {
    expect(roomSchema.safeParse({ name: "   ", rent: "1200", dueDay: "1" }).success).toBe(false);
  });
  it.each(["0", "", "abc", "-50", "12,345"])("rejects rent %s", (rent) => {
    expect(roomSchema.safeParse({ name: "A", rent, dueDay: "1" }).success).toBe(false);
  });
  it.each(["0", "29", "1.5"])("rejects due day %s", (dueDay) => {
    expect(roomSchema.safeParse({ name: "A", rent: "100", dueDay }).success).toBe(false);
  });
  it("accepts due days 1 and 28", () => {
    expect(roomSchema.safeParse({ name: "A", rent: "100", dueDay: "28" }).success).toBe(true);
  });
});

describe("findDuplicateRoomIndexes", () => {
  it("flags names that repeat, ignoring case and spaces", () => {
    expect([...findDuplicateRoomIndexes(["Room 1", "room  1 ", "Room 2"])]).toEqual([0, 1]);
  });
  it("ignores blank names", () => {
    expect(findDuplicateRoomIndexes(["", ""]).size).toBe(0);
  });
  it("returns nothing when all names differ", () => {
    expect(findDuplicateRoomIndexes(["A", "B", "C"]).size).toBe(0);
  });
});

describe("rooms helpers", () => {
  it("generates numbered rooms", () => {
    expect(generateRooms(2, "1200", "5", 3).map((r) => r.name)).toEqual(["Room 3", "Room 4"]);
  });
  it("summarises six rooms of R1 200 as R7 200", () => {
    expect(summariseRooms(generateRooms(6, "1200", "1"))).toEqual({
      count: 6,
      totalCents: 720_000,
    });
  });
  it("converts a room to cents", () => {
    expect(toRoomPayload({ name: " A ", rent: "1 250,50", dueDay: "3" })).toEqual({
      name: "A",
      monthly_rent_cents: 125_050,
      due_day: 3,
    });
  });
  it("requires at least one room", () => {
    expect(
      onboardingSchema.safeParse({
        name: "T",
        language: "en",
        propertyName: "P",
        address: "",
        rooms: [],
      }).success,
    ).toBe(false);
  });
});
