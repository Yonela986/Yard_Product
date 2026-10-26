import { describe, expect, it } from "vitest";

import { formatMoney, toCents } from "./money";

const cents = (s: string) => {
  const r = toCents(s);
  return r.ok ? r.cents : null;
};

describe("toCents", () => {
  it.each([
    ["1200", 120000],
    ["1 200", 120000],
    ["1200,50", 120050],
    ["1200.5", 120050],
    ["R1 200,50", 120050],
    ["R\u00a01\u00a0200", 120000],
    ["0", 0],
    ["0,07", 7],
    ["12,", 1200],
  ])("accepts %s", (input, expected) => {
    expect(cents(input)).toBe(expected);
  });

  it.each(["-50", "R-50", "12a", "abc", "1200,505", "1.2.3", "", "R", "1,200.50"])(
    "rejects %s",
    (input) => {
      expect(toCents(input).ok).toBe(false);
    },
  );
});

describe("formatMoney", () => {
  it("formats whole rands without decimals", () => {
    expect(formatMoney(120000)).toBe("R1\u00a0200");
  });
  it("formats cents with two decimals", () => {
    expect(formatMoney(125050)).toBe("R1\u00a0250,50");
    expect(formatMoney(5)).toBe("R0,05");
  });
  it("formats zero", () => {
    expect(formatMoney(0)).toBe("R0");
  });
  it("formats negatives", () => {
    expect(formatMoney(-5000)).toBe("-R50");
  });
  it("groups millions", () => {
    expect(formatMoney(123456789)).toBe("R1\u00a0234\u00a0567,89");
    expect(formatMoney(99900)).toBe("R999");
  });
  it("always shows cents when asked", () => {
    expect(formatMoney(120000, { showCents: "always" })).toBe("R1\u00a0200,00");
    expect(formatMoney(0, { showCents: "always" })).toBe("R0,00");
  });
  it("rejects non-integer input", () => {
    expect(() => formatMoney(1.5)).toThrow();
  });
});
