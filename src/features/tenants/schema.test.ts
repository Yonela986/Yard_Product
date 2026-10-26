import { describe, expect, it } from "vitest";

import { todayInSA } from "@/lib/dates";

import { parseDepositInput, tenantSchema } from "./schema";

describe("tenantSchema", () => {
  it("accepts a valid tenant form", () => {
    const result = tenantSchema.safeParse({
      name: "Ava",
      phone: "082 123 4567",
      roomId: "room-1",
      moveInDate: todayInSA(),
      deposit: "R1 200",
      language: "en",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid SA mobile numbers", () => {
    const result = tenantSchema.safeParse({
      name: "Ava",
      phone: "011 234 5678",
      roomId: "room-1",
      moveInDate: todayInSA(),
      deposit: "",
      language: "en",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("South African mobile number");
    }
  });

  it("parses deposit values from strings", () => {
    expect(parseDepositInput("R1 200")).toBe(120000);
    expect(parseDepositInput("")).toBe(0);
  });

  it("keeps move-in dates in ISO format", () => {
    const date = todayInSA();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(date)).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    const result = tenantSchema.safeParse({
      name: "Ava",
      phone: "082 123 4567",
      roomId: "room-1",
      moveInDate: "2026-02-30",
      deposit: "0",
      language: "en",
    });
    expect(result.success).toBe(false);
  });
});
