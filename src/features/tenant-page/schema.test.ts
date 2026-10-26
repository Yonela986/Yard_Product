import { describe, expect, it } from "vitest";

import { createTenantPaymentSchema } from "./schema";

describe("tenant payment notice schema", () => {
  const schema = createTenantPaymentSchema("2026-10-12");

  it("accepts a valid amount, date, method, and optional proof", () => {
    expect(
      schema.safeParse({
        amount: "1200.00",
        paidOn: "2026-10-12",
        method: "eft",
        proof: null,
      }).success,
    ).toBe(true);
  });

  it("refuses zero, amounts above R50 000, and future dates", () => {
    expect(
      schema.safeParse({ amount: "0", paidOn: "2026-10-12", method: "cash", proof: null }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        amount: "50000.01",
        paidOn: "2026-10-12",
        method: "cash",
        proof: null,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ amount: "10", paidOn: "2026-10-13", method: "cash", proof: null }).success,
    ).toBe(false);
  });

  it("refuses dates more than 90 days old", () => {
    expect(
      schema.safeParse({ amount: "10", paidOn: "2026-07-13", method: "cash", proof: null }).success,
    ).toBe(false);
  });
});
