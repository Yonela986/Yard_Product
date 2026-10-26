import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

import { firstName, renderTemplate } from "./render";

describe("firstName", () => {
  it.each([
    ["Ava Ndlovu", "Ava"],
    ["  Ava   Ndlovu  ", "Ava"],
    ["Thandi", "Thandi"],
  ])("extracts the first name from %j", (name, expected) => {
    expect(firstName(name)).toBe(expected);
  });

  it("rejects an empty name", () => {
    expect(() => firstName("  ")).toThrow("tenant name is required");
  });
});

describe("renderTemplate", () => {
  it("formats money and dates and replaces the first name", () => {
    expect(
      renderTemplate("{name}: {amount} due {due_date}", {
        name: "Ava Ndlovu",
        amount: 120_050,
        due_date: "2026-11-05",
      }),
    ).toBe(`Ava: ${formatMoney(120_050)} due 5 Nov`);
  });

  it("throws clearly for missing and unknown values", () => {
    expect(() => renderTemplate("Hi {name}", {})).toThrow("missing the {name}");
    expect(() => renderTemplate("Hi {unknown}", {})).toThrow("Unknown message variable");
  });
});
